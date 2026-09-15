/**
 * Тесты репозитория заявки.
 *
 * SQLite в Node не запускается (op-sqlite — нативный модуль), поэтому
 * граница `db/client` замокана, а проверяется то, что от неё зависит в
 * нашем коде: какие запросы уходят и в какой транзакции, как строки
 * превращаются в модель и что происходит с неожиданными данными.
 * Сами запросы проверены EXPLAIN QUERY PLAN на схеме миграции 1.
 */

import {
  StorageError,
  StorageErrorCode,
  isStorageError,
} from '../../../storage/errors';
import { ApplicationAlreadyExistsError } from '../errors';
import type {
  ApplicationId,
  ChecklistItemId,
  DocumentId,
  NewApplication,
  NonEmptyText,
} from '../model';
import {
  attachDocumentToItem,
  createApplication,
  getActiveApplication,
  listChecklistItems,
} from '../repository';

jest.mock('../../../db/client', () => ({
  getDb: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../../db/ids', () => ({
  newId: jest.fn(),
}));

// Файловое хранилище тянет нативные модули; здесь оно не участвует.
jest.mock('../../../storage/fs', () => ({
  deleteFile: jest.fn(),
  toRelativePath: (value: string) => value,
}));

const client = require('../../../db/client');
const ids = require('../../../db/ids');

type Rows = ReadonlyArray<Record<string, unknown>>;

function fakeDb(rows: Rows) {
  return { execute: jest.fn().mockResolvedValue({ rows }) };
}

/** Транзакция, в которой SELECT возвращает `existingRows`. */
function mockTransaction(existingRows: Rows) {
  const tx = {
    execute: jest.fn<Promise<{ rows: Rows }>, [string, unknown[]?]>(async sql =>
      sql.startsWith('SELECT') ? { rows: existingRows } : { rows: [] },
    ),
  };
  client.withTransaction.mockImplementation(
    async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  );
  return tx;
}

function text(value: string): NonEmptyText {
  return value as NonEmptyText;
}

const NEW_APPLICATION: NewApplication = {
  title: text('ВНЖ Сербия'),
  itemLabels: [text('Паспорт'), text('Фото'), text('Справка')],
};

async function failureOf(action: () => Promise<unknown>): Promise<unknown> {
  return action().then(
    () => undefined,
    (error: unknown) => error,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  let counter = 0;
  ids.newId.mockImplementation(() => `id-${++counter}`);
});

describe('getActiveApplication', () => {
  it('без заявки возвращает null', async () => {
    client.getDb.mockResolvedValue(fakeDb([]));
    await expect(getActiveApplication()).resolves.toBeNull();
  });

  it('возвращает заявку из строки', async () => {
    client.getDb.mockResolvedValue(fakeDb([{ id: 'app-1', title: 'ВНЖ' }]));
    await expect(getActiveApplication()).resolves.toEqual({
      id: 'app-1',
      title: 'ВНЖ',
    });
  });

  it('строка неожиданной формы — StorageError, а не undefined в модели', async () => {
    client.getDb.mockResolvedValue(fakeDb([{ id: 'app-1', title: null }]));
    const error = await failureOf(getActiveApplication);
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });

  it('сбой драйвера оборачивается в StorageError', async () => {
    client.getDb.mockResolvedValue({
      execute: jest.fn().mockRejectedValue(new Error('SQLITE_CORRUPT')),
    });
    const error = await failureOf(getActiveApplication);
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });

  it('ошибка открытия базы сохраняет свой код', async () => {
    client.getDb.mockRejectedValue(
      new StorageError(StorageErrorCode.EncryptionKeyLost, 'ключ потерян'),
    );
    const error = await failureOf(getActiveApplication);
    expect(isStorageError(error, StorageErrorCode.EncryptionKeyLost)).toBe(
      true,
    );
  });
});

describe('createApplication', () => {
  it('пишет заявку и пункты в одной транзакции, в порядке пользователя', async () => {
    const tx = mockTransaction([]);

    const application = await createApplication(NEW_APPLICATION);

    expect(client.withTransaction).toHaveBeenCalledTimes(1);
    expect(application).toEqual({ id: 'id-1', title: 'ВНЖ Сербия' });

    const [guard, insertApplication, ...insertItems] = tx.execute.mock.calls;

    expect(guard?.[0]).toContain('FROM applications');
    expect(insertApplication?.[0]).toContain('INSERT INTO applications');
    expect(insertApplication?.[1]).toEqual([
      'id-1',
      'ВНЖ Сербия',
      expect.any(String),
      expect.any(String),
    ]);

    expect(
      insertItems.map(call => {
        const params = call[1] as unknown as unknown[];
        return {
          applicationId: params[1],
          label: params[2],
          position: params[3],
        };
      }),
    ).toEqual([
      { applicationId: 'id-1', label: 'Паспорт', position: 0 },
      { applicationId: 'id-1', label: 'Фото', position: 1 },
      { applicationId: 'id-1', label: 'Справка', position: 2 },
    ]);
  });

  it('у каждого пункта свой id', async () => {
    const tx = mockTransaction([]);
    await createApplication(NEW_APPLICATION);

    const itemIds = tx.execute.mock.calls
      .slice(2)
      .map(call => (call[1] as unknown as unknown[])[0]);
    expect(new Set(itemIds).size).toBe(3);
  });

  it('вторую заявку не создаёт и ничего не пишет', async () => {
    const tx = mockTransaction([{ 1: 1 }]);

    const error = await failureOf(() => createApplication(NEW_APPLICATION));

    expect(error).toBeInstanceOf(ApplicationAlreadyExistsError);
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });

  it('сбой записи — StorageError', async () => {
    client.withTransaction.mockRejectedValue(new Error('SQLITE_FULL'));
    const error = await failureOf(() => createApplication(NEW_APPLICATION));
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });
});

describe('listChecklistItems', () => {
  const APP_ID = 'app-1' as ApplicationId;

  /** Транзакция чтения: запрос пунктов и запрос документов по тексту SQL. */
  function mockReadTransaction(itemRows: Rows, documentRows: Rows) {
    const tx = {
      execute: jest.fn<Promise<{ rows: Rows }>, [string, unknown[]?]>(
        async sql => ({
          rows: sql.includes('FROM checklist_items ci')
            ? documentRows
            : itemRows,
        }),
      ),
    };
    client.withTransaction.mockImplementation(
      async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    );
    return tx;
  }

  it('пункты по порядку, с документами своих пунктов — в одной транзакции', async () => {
    const tx = mockReadTransaction(
      [
        { id: 'i1', label: 'Паспорт', position: 0, status: 'attached' },
        { id: 'i2', label: 'Фото', position: 1, status: 'pending' },
      ],
      [
        { checklist_item_id: 'i1', id: 'd1', original_filename: 'стр1.jpg' },
        { checklist_item_id: 'i1', id: 'd2', original_filename: null },
      ],
    );

    await expect(listChecklistItems(APP_ID)).resolves.toEqual([
      {
        id: 'i1',
        label: 'Паспорт',
        position: 0,
        status: 'attached',
        documents: [
          { id: 'd1', name: 'стр1.jpg' },
          { id: 'd2', name: null },
        ],
      },
      {
        id: 'i2',
        label: 'Фото',
        position: 1,
        status: 'pending',
        documents: [],
      },
    ]);
    expect(client.withTransaction).toHaveBeenCalledTimes(1);
    expect(tx.execute).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY position'),
      [APP_ID],
    );
    expect(tx.execute).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY cid.attached_at'),
      [APP_ID],
    );
  });

  it.each([
    ['неизвестный статус', { id: 'i', label: 'А', position: 0, status: 'x' }],
    ['дробная позиция', { id: 'i', label: 'А', position: 0.5, status: 'done' }],
    ['позиция строкой', { id: 'i', label: 'А', position: '0', status: 'done' }],
  ])('%s — StorageError', async (_name, row) => {
    mockReadTransaction([row], []);
    const error = await failureOf(() => listChecklistItems(APP_ID));
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });

  it('имя документа неожиданного типа — StorageError', async () => {
    mockReadTransaction(
      [{ id: 'i1', label: 'А', position: 0, status: 'attached' }],
      [{ checklist_item_id: 'i1', id: 'd1', original_filename: 42 }],
    );
    const error = await failureOf(() => listChecklistItems(APP_ID));
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });
});

describe('attachDocumentToItem', () => {
  const ATTACHMENT = {
    id: 'doc-1' as DocumentId,
    itemId: 'item-1' as ChecklistItemId,
    filePath: 'documents/doc-1',
    originalFilename: 'Паспорт.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
  };

  it('документ, связь и отметка пункта — одной транзакцией, параметрами', async () => {
    const tx = mockTransaction([]);

    await attachDocumentToItem(ATTACHMENT);

    expect(client.withTransaction).toHaveBeenCalledTimes(1);
    const calls = tx.execute.mock.calls;
    expect(calls.map(([sql]) => sql.split(' ').slice(0, 3).join(' '))).toEqual([
      'INSERT INTO documents',
      'INSERT INTO checklist_item_documents',
      'UPDATE checklist_items SET',
    ]);
    expect(calls[0]?.[1]).toEqual([
      'doc-1',
      'Паспорт.pdf',
      'documents/doc-1',
      'application/pdf',
      2048,
      expect.any(String),
      expect.any(String),
    ]);
    expect(calls[1]?.[1]).toEqual(['item-1', 'doc-1', expect.any(String)]);
    expect(calls[2]?.[1]).toEqual([expect.any(String), 'item-1']);
    // Имя файла — только параметром, в текст SQL оно не попадает.
    expect(calls.some(([sql]) => sql.includes('Паспорт'))).toBe(false);
  });

  it('транзакция упала (например, пункт уже удалён) — StorageError', async () => {
    client.withTransaction.mockRejectedValue(
      new Error('FOREIGN KEY constraint failed'),
    );
    const error = await failureOf(() => attachDocumentToItem(ATTACHMENT));
    expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
  });
});
