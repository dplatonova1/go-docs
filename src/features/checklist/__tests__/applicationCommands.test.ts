/**
 * Команды над заявкой целиком: удаление, подсчёт последствий,
 * переименование.
 *
 * Драйвер БД замокан на нашей границе — проверяется, какие запросы
 * уходят и с какими параметрами. Сам каскад `ON DELETE` живёт в схеме и
 * на устройстве (см. «Отложенные обязательства» в CLAUDE.md).
 */

import { StorageErrorCode, isStorageError } from '../../../storage/errors';
import type { ApplicationId, NonEmptyText } from '../model';
import {
  deleteApplication,
  getApplicationDeletionImpact,
  renameApplication,
} from '../repository';

jest.mock('../../../db/client', () => ({
  getDb: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../../db/ids', () => ({ newId: jest.fn() }));

// Файловое хранилище тянет нативные модули. Удаление заявки его больше
// не трогает вовсе — это здесь и проверяется.
jest.mock('../../../storage/fs', () => ({
  deleteFile: jest.fn(),
  toRelativePath: (value: string) => value,
}));

const client = require('../../../db/client');
const fs = require('../../../storage/fs');

type Rows = ReadonlyArray<Record<string, unknown>>;

const APP_ID = 'app-1' as ApplicationId;

function fakeDb(rowsFor: (sql: string) => Rows = () => []) {
  return {
    execute: jest.fn<Promise<{ rows: Rows }>, [string, unknown[]?]>(
      async sql => ({ rows: rowsFor(sql) }),
    ),
  };
}

async function failureOf(action: () => Promise<unknown>): Promise<unknown> {
  return action().then(
    () => undefined,
    (error: unknown) => error,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('deleteApplication', () => {
  it('удаляет только заявку — пункты и связи снимает каскад', async () => {
    const db = fakeDb();
    client.getDb.mockResolvedValue(db);

    await deleteApplication(APP_ID);

    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(db.execute).toHaveBeenCalledWith(
      'DELETE FROM applications WHERE id = ?',
      [APP_ID],
    );
  });

  it('документы и их файлы не трогаются (ADR-0016)', async () => {
    const db = fakeDb();
    client.getDb.mockResolvedValue(db);

    await deleteApplication(APP_ID);

    const statements = db.execute.mock.calls.map(([sql]) => sql);
    expect(statements.some(sql => sql.includes('documents'))).toBe(false);
    expect(fs.deleteFile).not.toHaveBeenCalled();
  });

  it('собственная транзакция не нужна: один оператор', async () => {
    client.getDb.mockResolvedValue(fakeDb());

    await deleteApplication(APP_ID);

    expect(client.withTransaction).not.toHaveBeenCalled();
  });

  it('сбой драйвера — StorageError', async () => {
    client.getDb.mockResolvedValue({
      execute: jest.fn().mockRejectedValue(new Error('SQLITE_BUSY')),
    });

    const error = await failureOf(() => deleteApplication(APP_ID));
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });
});

describe('getApplicationDeletionImpact', () => {
  it('считает пункты и документы заявки', async () => {
    const db = fakeDb(sql =>
      sql.includes('FROM checklist_items') ? [{ count: 7 }] : [{ count: 2 }],
    );
    client.getDb.mockResolvedValue(db);

    await expect(getApplicationDeletionImpact(APP_ID)).resolves.toEqual({
      itemCount: 7,
      documentCount: 2,
    });
  });

  it('документы считаются по заявке, а не по связям', async () => {
    // Один документ на трёх пунктах — для пользователя один файл,
    // поэтому запрос идёт по `documents` с EXISTS, а не по связям.
    const db = fakeDb(() => [{ count: 1 }]);
    client.getDb.mockResolvedValue(db);

    await getApplicationDeletionImpact(APP_ID);

    const [documentsSql, params] = db.execute.mock.calls[1] as unknown as [
      string,
      unknown[],
    ];
    expect(documentsSql).toContain('COUNT(*) AS count FROM documents');
    expect(documentsSql).toContain('EXISTS');
    expect(params).toEqual([APP_ID]);
  });

  it('неожиданный ответ COUNT — StorageError, а не NaN в диалоге', async () => {
    client.getDb.mockResolvedValue(fakeDb(() => [{ count: 'много' }]));

    const error = await failureOf(() => getApplicationDeletionImpact(APP_ID));
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });
});

describe('renameApplication', () => {
  const TITLE = 'ВНЖ Сербия 2027' as NonEmptyText;

  it('пишет название и время изменения', async () => {
    const db = fakeDb();
    client.getDb.mockResolvedValue(db);

    await renameApplication(APP_ID, TITLE);

    const [sql, params] = db.execute.mock.calls[0] as unknown as [
      string,
      unknown[],
    ];
    expect(sql).toBe(
      'UPDATE applications SET title = ?, updated_at = ? WHERE id = ?',
    );
    expect(params).toEqual([TITLE, expect.any(String), APP_ID]);
  });

  it('сбой драйвера — StorageError', async () => {
    client.getDb.mockResolvedValue({
      execute: jest.fn().mockRejectedValue(new Error('SQLITE_READONLY')),
    });

    const error = await failureOf(() => renameApplication(APP_ID, TITLE));
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });
});
