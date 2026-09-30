/**
 * Запросы библиотеки документов.
 *
 * Драйвер БД замокан на нашей границе: проверяется, какие запросы уходят,
 * в какой транзакции и что происходит со статусами пунктов. Сам каскад
 * `ON DELETE` живёт в схеме и проверяется на устройстве.
 */

import { StorageErrorCode, isStorageError } from '../../../storage/errors';
import type { ChecklistItemId, DocumentId } from '../model';
import {
  attachLibraryDocumentToItem,
  deleteDocument,
  getDocumentUsage,
  listLibraryDocuments,
} from '../repository';

jest.mock('../../../db/client', () => ({
  getDb: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../../db/ids', () => ({ newId: jest.fn() }));

jest.mock('../../../storage/fs', () => ({
  deleteFile: jest.fn(),
  toRelativePath: (value: string) => value,
}));

const client = require('../../../db/client');

type Rows = ReadonlyArray<Record<string, unknown>>;

const ITEM_ID = 'item-1' as ChecklistItemId;
const DOCUMENT_ID = 'doc-1' as DocumentId;

const DOCUMENT_ROW = {
  id: 'doc-1',
  original_filename: 'Паспорт.pdf',
  mime_type: 'application/pdf',
  size_bytes: 2048,
  file_path: 'documents/doc-1',
  created_at: '2026-03-12T10:00:00.000Z',
};

function fakeDb(rowsFor: (sql: string) => Rows = () => []) {
  return {
    execute: jest.fn<Promise<{ rows: Rows }>, [string, unknown[]?]>(
      async sql => ({ rows: rowsFor(sql) }),
    ),
  };
}

function mockTransaction(rowsFor: (sql: string) => Rows) {
  const tx = {
    execute: jest.fn<Promise<{ rows: Rows }>, [string, unknown[]?]>(
      async sql => ({ rows: rowsFor(sql) }),
    ),
  };
  client.withTransaction.mockImplementation(
    async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  );
  return tx;
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

describe('listLibraryDocuments', () => {
  it('на просмотре читает только документы, новые сверху', async () => {
    const tx = mockTransaction(() => [DOCUMENT_ROW]);

    const documents = await listLibraryDocuments(null);

    expect(documents).toEqual([
      {
        id: 'doc-1',
        name: 'Паспорт.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        createdAt: '2026-03-12T10:00:00.000Z',
        filePath: 'documents/doc-1',
        isAttachedToItem: false,
      },
    ]);

    expect(tx.execute).toHaveBeenCalledTimes(1);
    const [sql] = tx.execute.mock.calls[0] as unknown as [string];
    expect(sql).toContain('FROM documents ORDER BY created_at DESC');
  });

  it('для выбора файла отмечает уже прикреплённые к пункту', async () => {
    const tx = mockTransaction(sql =>
      sql.includes('WHERE checklist_item_id = ?')
        ? [{ document_id: 'doc-1' }]
        : [DOCUMENT_ROW, { ...DOCUMENT_ROW, id: 'doc-2' }],
    );

    const documents = await listLibraryDocuments(ITEM_ID);

    expect(documents.map(document => document.isAttachedToItem)).toEqual([
      true,
      false,
    ]);
    // Оба запроса в одной транзакции: иначе прикрепление между ними
    // дало бы документ без отметки.
    expect(client.withTransaction).toHaveBeenCalledTimes(1);
    expect(tx.execute.mock.calls[0]?.[1]).toEqual([ITEM_ID]);
  });

  it('неожиданный размер в строке — StorageError, а не NaN в превью', async () => {
    mockTransaction(() => [{ ...DOCUMENT_ROW, size_bytes: 'много' }]);

    const error = await failureOf(() => listLibraryDocuments(null));
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });

  it('размер может отсутствовать — это не ошибка', async () => {
    mockTransaction(() => [{ ...DOCUMENT_ROW, size_bytes: null }]);

    const [document] = await listLibraryDocuments(null);
    expect(document?.sizeBytes).toBeNull();
  });
});

describe('getDocumentUsage', () => {
  it('считает пункты по заявкам и общий итог', async () => {
    client.getDb.mockResolvedValue(
      fakeDb(() => [
        { title: 'ВНЖ Сербия', count: 2 },
        { title: 'ПМЖ', count: 1 },
      ]),
    );

    await expect(getDocumentUsage(DOCUMENT_ID)).resolves.toEqual({
      itemCount: 3,
      applications: [
        { applicationTitle: 'ВНЖ Сербия', itemCount: 2 },
        { applicationTitle: 'ПМЖ', itemCount: 1 },
      ],
    });
  });

  it('документ никуда не прикреплён — пустой список и ноль', async () => {
    client.getDb.mockResolvedValue(fakeDb(() => []));

    await expect(getDocumentUsage(DOCUMENT_ID)).resolves.toEqual({
      itemCount: 0,
      applications: [],
    });
  });

  it('ищет по индексу связей, а не перебором документов', async () => {
    const db = fakeDb(() => []);
    client.getDb.mockResolvedValue(db);

    await getDocumentUsage(DOCUMENT_ID);

    const [sql, params] = db.execute.mock.calls[0] as unknown as [
      string,
      unknown[],
    ];
    expect(sql).toContain('FROM checklist_item_documents cid');
    expect(sql).toContain('WHERE cid.document_id = ?');
    expect(params).toEqual([DOCUMENT_ID]);
  });
});

describe('attachLibraryDocumentToItem', () => {
  it('добавляет только связь и отмечает пункт прикреплённым', async () => {
    const tx = mockTransaction(() => []);

    await expect(
      attachLibraryDocumentToItem(ITEM_ID, DOCUMENT_ID),
    ).resolves.toBe('attached');

    const statements = tx.execute.mock.calls.map(([sql]) =>
      sql.split(' ').slice(0, 3).join(' '),
    );
    expect(statements).toEqual([
      'SELECT 1 FROM',
      'INSERT INTO checklist_item_documents',
      'UPDATE checklist_items SET',
    ]);
    // Файл не перечитывается и в `documents` ничего не пишется — ради
    // этого документы и общие (ADR-0010).
    expect(
      tx.execute.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO documents'),
      ),
    ).toBe(false);
  });

  it('повторное прикрепление — значение, а не исключение', async () => {
    const tx = mockTransaction(sql =>
      sql.startsWith('SELECT') ? [{ 1: 1 }] : [],
    );

    await expect(
      attachLibraryDocumentToItem(ITEM_ID, DOCUMENT_ID),
    ).resolves.toBe('already-attached');

    expect(tx.execute).toHaveBeenCalledTimes(1);
  });

  it('сбой транзакции — StorageError', async () => {
    client.withTransaction.mockRejectedValue(new Error('SQLITE_BUSY'));

    const error = await failureOf(() =>
      attachLibraryDocumentToItem(ITEM_ID, DOCUMENT_ID),
    );
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });
});

describe('deleteDocument', () => {
  function mockDeleteTransaction(options: {
    itemIds?: readonly string[];
    remainingOfItem?: Rows;
  }) {
    return mockTransaction(sql => {
      if (sql.startsWith('SELECT file_path')) {
        return [{ file_path: 'documents/doc-1' }];
      }
      if (sql.startsWith('SELECT checklist_item_id')) {
        return (options.itemIds ?? []).map(id => ({ checklist_item_id: id }));
      }
      if (sql.includes('WHERE checklist_item_id = ?')) {
        return options.remainingOfItem ?? [];
      }
      return [];
    });
  }

  it('отдаёт путь файла и удаляет запись — связи снимает каскад', async () => {
    const tx = mockDeleteTransaction({});

    await expect(deleteDocument(DOCUMENT_ID)).resolves.toBe('documents/doc-1');

    const statements = tx.execute.mock.calls.map(([sql]) =>
      sql.split(' ').slice(0, 3).join(' '),
    );
    expect(statements).toEqual([
      'SELECT file_path FROM',
      'SELECT checklist_item_id FROM',
      'DELETE FROM documents',
    ]);
  });

  it('пункты, оставшиеся без файлов, снова становятся неотмеченными', async () => {
    const tx = mockDeleteTransaction({ itemIds: ['item-1', 'item-2'] });

    await deleteDocument(DOCUMENT_ID);

    const updates = tx.execute.mock.calls.filter(([sql]) =>
      sql.startsWith('UPDATE checklist_items'),
    );
    expect(updates.map(call => (call[1] as unknown as unknown[])[1])).toEqual([
      'item-1',
      'item-2',
    ]);
  });

  it('у пункта остались другие файлы — статус не трогается', async () => {
    const tx = mockDeleteTransaction({
      itemIds: ['item-1'],
      remainingOfItem: [{ 1: 1 }],
    });

    await deleteDocument(DOCUMENT_ID);

    expect(
      tx.execute.mock.calls.some(([sql]) =>
        sql.startsWith('UPDATE checklist_items'),
      ),
    ).toBe(false);
  });

  it('записи уже нет — null, и ничего не удаляется', async () => {
    const tx = mockTransaction(() => []);

    await expect(deleteDocument(DOCUMENT_ID)).resolves.toBeNull();
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });

  it('сбой транзакции — StorageError', async () => {
    client.withTransaction.mockRejectedValue(new Error('SQLITE_FULL'));

    const error = await failureOf(() => deleteDocument(DOCUMENT_ID));
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });
});
