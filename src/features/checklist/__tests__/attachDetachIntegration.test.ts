/**
 * Связка «файл на диске + записи в БД» целиком, без моков репозитория.
 *
 * Мокаются только границы: драйвер БД (`db/client`), файловое хранилище и
 * пикер. Репозиторий работает настоящий, поэтому здесь видно, какие
 * запросы уходят в транзакцию и в каком порядке трогаются файл и база.
 *
 * Проверяются главные свойства обеих операций: при прикреплении не
 * остаётся ни файла без записи в БД, ни записи без файла; открепление же
 * вообще не трогает ни файл, ни строку в `documents` — снимается только
 * связь (ADR-0013, раздел «Обновление»).
 */

import { StorageErrorCode, isStorageError } from '../../../storage/errors';
import { attachPickedDocument } from '../attachDocument';
import type { ChecklistItemId, DocumentId } from '../model';
import { detachDocumentFromItem } from '../repository';

jest.mock('../../../db/client', () => ({
  getDb: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../../db/ids', () => ({ newId: jest.fn() }));

jest.mock('../../../storage/fs', () => ({
  writeFile: jest.fn(),
  deleteFile: jest.fn(),
  assertEnoughSpace: jest.fn(),
  toRelativePath: (value: string) => value,
}));

jest.mock('../../../storage/localCopy', () => ({
  readCachedCopy: jest.fn(),
  deleteCachedCopy: jest.fn(),
}));

// Здесь проверяется путь после выбора файла, поэтому сам пикер (нативный
// модуль) не поднимается: тесты выбора — в pickDocument.test.ts.
jest.mock('../pickDocument', () => ({ pickDocument: jest.fn() }));

const client = require('../../../db/client');
const ids = require('../../../db/ids');
const fs = require('../../../storage/fs');
const localCopy = require('../../../storage/localCopy');

type Rows = ReadonlyArray<Record<string, unknown>>;

const ITEM_ID = 'item-1' as ChecklistItemId;
const DOCUMENT_ID = 'doc-1' as DocumentId;
const FILE_PATH = 'documents/doc-1';
const BYTES = new Uint8Array([1, 2, 3]);

const PICKED = {
  localUri: 'file:///cache/UUID/picked-document',
  name: 'Паспорт.pdf',
  mimeType: 'application/pdf',
};

/** Журнал: SQL-операторы и операции с файлами в порядке выполнения. */
let log: string[];

/**
 * Транзакция поверх поддельного драйвера.
 *
 * @param rowsFor ответы на SELECT по началу текста запроса.
 * @param failOn подстрока запроса, на котором драйвер бросает ошибку —
 *   так проверяется откат.
 */
function mockDatabase(rowsFor: (sql: string) => Rows, failOn?: string) {
  const tx = {
    execute: jest.fn<Promise<{ rows: Rows }>, [string, unknown[]?]>(
      async sql => {
        if (failOn !== undefined && sql.includes(failOn)) {
          log.push(`FAILED ${sql.split(' ').slice(0, 3).join(' ')}`);
          throw new Error('SQLITE_CONSTRAINT');
        }
        log.push(sql.split(' ').slice(0, 3).join(' '));
        return { rows: rowsFor(sql) };
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

  return tx;
}

beforeEach(() => {
  jest.resetAllMocks();
  log = [];
  ids.newId.mockReturnValue('doc-1');
  localCopy.readCachedCopy.mockResolvedValue(BYTES);
  localCopy.deleteCachedCopy.mockResolvedValue(undefined);
  fs.writeFile.mockImplementation(async (path: string) => {
    log.push(`write-file ${path}`);
  });
  fs.deleteFile.mockImplementation(async (path: string) => {
    log.push(`delete-file ${path}`);
  });
  fs.assertEnoughSpace.mockResolvedValue(undefined);
  // Поиск по отпечатку идёт вне транзакции, своим соединением: до
  // записи такого документа ещё нет.
  client.getDb.mockResolvedValue({
    execute: jest.fn().mockResolvedValue({ rows: [] }),
  });
});

describe('прикрепление файла', () => {
  /** Поиск по отпечатку до записи ничего не находит, после — нашу строку. */
  function rowsForAttach(sql: string): Rows {
    return sql.includes('WHERE content_hash = ?')
      ? [{ id: 'doc-1', original_filename: 'Паспорт.pdf' }]
      : [];
  }

  it('успех: файл записан, затем записи в одной транзакции', async () => {
    mockDatabase(rowsForAttach);

    const result = await attachPickedDocument(ITEM_ID, PICKED);

    expect(result).toEqual({
      status: 'attached',
      document: { id: 'doc-1', name: 'Паспорт.pdf' },
    });
    expect(log).toEqual([
      `write-file ${FILE_PATH}`,
      'INSERT OR IGNORE',
      'SELECT id, original_filename',
      'SELECT 1 FROM',
      'INSERT INTO checklist_item_documents',
      'UPDATE checklist_items SET',
      'COMMIT',
    ]);
    expect(client.withTransaction).toHaveBeenCalledTimes(1);
    expect(fs.deleteFile).not.toHaveBeenCalled();
  });

  it('сбой в транзакции после записи файла — файл удаляется с диска', async () => {
    mockDatabase(rowsForAttach, 'INSERT INTO checklist_item_documents');

    const error = await attachPickedDocument(ITEM_ID, PICKED).catch(
      (e: unknown) => e,
    );

    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
    // Транзакция не закоммичена, и файла после неё не остаётся.
    expect(log).not.toContain('COMMIT');
    expect(log[log.length - 1]).toBe(`delete-file ${FILE_PATH}`);
    expect(fs.deleteFile).toHaveBeenCalledWith(FILE_PATH);
  });
});

describe('открепление файла от пункта', () => {
  it('снимается только связь: ни documents, ни файл не трогаются', async () => {
    mockDatabase(() => []);

    await detachDocumentFromItem(ITEM_ID, DOCUMENT_ID);

    expect(log).toEqual([
      'DELETE FROM checklist_item_documents',
      'SELECT 1 FROM',
      'UPDATE checklist_items SET',
      'COMMIT',
    ]);
    expect(fs.deleteFile).not.toHaveBeenCalled();
  });

  it('у пункта остались другие файлы — статус не понижается', async () => {
    mockDatabase(sql =>
      sql.includes('WHERE checklist_item_id = ?') ? [{ 1: 1 }] : [],
    );

    await detachDocumentFromItem(ITEM_ID, DOCUMENT_ID);

    expect(log).not.toContain('UPDATE checklist_items SET');
    expect(log).toContain('COMMIT');
  });

  it('сбой на снятии связи — транзакция откатывается, файл цел', async () => {
    mockDatabase(() => [], 'DELETE FROM checklist_item_documents');

    const error = await detachDocumentFromItem(ITEM_ID, DOCUMENT_ID).catch(
      (e: unknown) => e,
    );

    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
    expect(log).not.toContain('COMMIT');
    expect(fs.deleteFile).not.toHaveBeenCalled();
  });
});
