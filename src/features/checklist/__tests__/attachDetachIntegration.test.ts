/**
 * Связка «файл на диске + записи в БД» целиком, без моков репозитория.
 *
 * Мокаются только границы: драйвер БД (`db/client`), файловое хранилище и
 * пикер. Репозиторий работает настоящий, поэтому здесь видно, какие
 * запросы уходят в транзакцию и в каком порядке трогаются файл и база.
 *
 * Проверяется главное свойство обеих операций: не остаётся ни файла без
 * записи в БД, ни записи без файла.
 */

import { StorageErrorCode, isStorageError } from '../../../storage/errors';
import { attachPickedDocument } from '../attachDocument';
import { deleteAttachedDocument } from '../detachDocument';
import type { ChecklistItemId, DocumentId } from '../model';

jest.mock('../../../db/client', () => ({
  getDb: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../../db/ids', () => ({ newId: jest.fn() }));

jest.mock('../../../storage/fs', () => ({
  writeFile: jest.fn(),
  deleteFile: jest.fn(),
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
});

describe('прикрепление файла', () => {
  it('успех: файл записан, затем три записи в одной транзакции', async () => {
    mockDatabase(() => []);

    const document = await attachPickedDocument(ITEM_ID, PICKED);

    expect(document).toEqual({ id: 'doc-1', name: 'Паспорт.pdf' });
    expect(log).toEqual([
      `write-file ${FILE_PATH}`,
      'INSERT INTO documents',
      'INSERT INTO checklist_item_documents',
      'UPDATE checklist_items SET',
      'COMMIT',
    ]);
    expect(client.withTransaction).toHaveBeenCalledTimes(1);
    expect(fs.deleteFile).not.toHaveBeenCalled();
  });

  it('сбой в транзакции после записи файла — файл удаляется с диска', async () => {
    mockDatabase(() => [], 'INSERT INTO checklist_item_documents');

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

describe('удаление прикреплённого файла', () => {
  function rowsForDetach(sql: string): Rows {
    if (sql.startsWith('SELECT file_path')) {
      return [{ file_path: FILE_PATH }];
    }
    // Ни других связей у документа, ни других файлов у пункта.
    return [];
  }

  it('успех: связь, запись документа и файл — все три части', async () => {
    mockDatabase(rowsForDetach);

    await deleteAttachedDocument(ITEM_ID, DOCUMENT_ID);

    expect(log).toEqual([
      'SELECT file_path FROM',
      'DELETE FROM checklist_item_documents',
      'SELECT 1 FROM',
      'DELETE FROM documents',
      'SELECT 1 FROM',
      'UPDATE checklist_items SET',
      'COMMIT',
      `delete-file ${FILE_PATH}`,
    ]);
  });

  it('сбой на удалении документа — транзакция откатывается, файл цел', async () => {
    mockDatabase(rowsForDetach, 'DELETE FROM documents');

    const error = await deleteAttachedDocument(ITEM_ID, DOCUMENT_ID).catch(
      (e: unknown) => e,
    );

    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
    expect(log).not.toContain('COMMIT');
    // Файл не тронут: связь и запись документа остались в базе.
    expect(fs.deleteFile).not.toHaveBeenCalled();
  });

  it('документ прикреплён к другому пункту — запись и файл сохраняются', async () => {
    mockDatabase(sql =>
      sql.startsWith('SELECT file_path')
        ? [{ file_path: FILE_PATH }]
        : sql.includes('WHERE document_id = ?')
        ? [{ 1: 1 }]
        : [],
    );

    await deleteAttachedDocument(ITEM_ID, DOCUMENT_ID);

    expect(log).not.toContain('DELETE FROM documents');
    expect(fs.deleteFile).not.toHaveBeenCalled();
  });
});
