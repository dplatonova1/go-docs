/**
 * Сброс заявки в репозитории: порядок операций по ADR-0012.
 *
 * Сама выборка «документ только этой заявки» проверена на реальной схеме
 * SQLite вне Jest (3000 документов, общий документ двух заявок остаётся).
 * Здесь — то, что от SQL не зависит: транзакция, порядок шагов, файлы
 * только после commit, поведение при сбоях.
 */

import { StorageErrorCode, isStorageError } from '../../../storage/errors';
import type { ApplicationId } from '../model';
import { deleteApplication, getResetImpact } from '../repository';

jest.mock('../../../db/client', () => ({
  getDb: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../../db/ids', () => ({
  newId: jest.fn(),
}));

jest.mock('../../../storage/fs', () => ({
  deleteFile: jest.fn(),
  toRelativePath: (value: string) => value,
}));

const client = require('../../../db/client');
const fs = require('../../../storage/fs');

type Rows = ReadonlyArray<Record<string, unknown>>;

const APP_ID = 'app-1' as ApplicationId;

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
  /** Журнал шагов: SQL, commit и удаление файлов — в порядке выполнения. */
  let log: string[];

  function mockTransaction(documentPaths: readonly string[]) {
    log = [];
    const tx = {
      execute: jest.fn<Promise<{ rows: Rows }>, [string, unknown[]?]>(
        async sql => {
          log.push(sql);
          return sql.startsWith('SELECT file_path')
            ? { rows: documentPaths.map(path => ({ file_path: path })) }
            : { rows: [] };
        },
      ),
    };

    client.withTransaction.mockImplementation(
      async (fn: (t: typeof tx) => Promise<unknown>) => {
        const result = await fn(tx);
        log.push('COMMIT');
        return result;
      },
    );

    fs.deleteFile.mockImplementation(async (path: string) => {
      log.push(`delete-file ${path}`);
    });

    return tx;
  }

  it('одной транзакцией: пути документов → документы → заявка', async () => {
    const tx = mockTransaction([]);

    await deleteApplication(APP_ID);

    expect(client.withTransaction).toHaveBeenCalledTimes(1);
    const calls = tx.execute.mock.calls;
    expect(calls.map(([sql]) => sql.split(' ').slice(0, 3).join(' '))).toEqual([
      'SELECT file_path FROM',
      'DELETE FROM documents',
      'DELETE FROM applications',
    ]);
    // Документы — только те, что не прикреплены к другим заявкам.
    expect(calls[0]?.[0]).toContain('NOT EXISTS');
    expect(calls[1]?.[0]).toContain('NOT EXISTS');
    expect(calls.map(([, params]) => params)).toEqual([
      [APP_ID, APP_ID],
      [APP_ID, APP_ID],
      [APP_ID],
    ]);
  });

  it('файлы стираются только после commit', async () => {
    mockTransaction(['documents/a.bin', 'documents/b.bin']);

    await deleteApplication(APP_ID);

    const commit = log.indexOf('COMMIT');
    expect(commit).toBeGreaterThan(-1);
    expect(log.slice(commit + 1)).toEqual([
      'delete-file documents/a.bin',
      'delete-file documents/b.bin',
    ]);
  });

  it('сбой транзакции — StorageError, файлы не трогаются', async () => {
    client.withTransaction.mockRejectedValue(new Error('SQLITE_BUSY'));

    const error = await failureOf(() => deleteApplication(APP_ID));

    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
    expect(fs.deleteFile).not.toHaveBeenCalled();
  });

  it('ошибка удаления одного файла не мешает остальным и не ломает сброс', async () => {
    mockTransaction(['documents/a.bin', 'documents/b.bin']);
    fs.deleteFile
      .mockRejectedValueOnce(new Error('EACCES'))
      .mockResolvedValueOnce(undefined);

    await expect(deleteApplication(APP_ID)).resolves.toBeUndefined();
    expect(fs.deleteFile).toHaveBeenCalledTimes(2);
  });
});

describe('getResetImpact', () => {
  it('считает пункты, удаляемые и остающиеся документы', async () => {
    const execute = jest.fn(async (sql: string) => {
      if (sql.includes('FROM checklist_items WHERE')) {
        return { rows: [{ count: 7 }] };
      }
      return { rows: [{ count: sql.includes('NOT EXISTS') ? 2 : 1 }] };
    });
    client.getDb.mockResolvedValue({ execute });

    await expect(getResetImpact(APP_ID)).resolves.toEqual({
      itemCount: 7,
      deletedDocumentCount: 2,
      keptDocumentCount: 1,
    });
  });

  it('неожиданный ответ COUNT — StorageError', async () => {
    client.getDb.mockResolvedValue({
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    });

    const error = await failureOf(() => getResetImpact(APP_ID));

    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });
});
