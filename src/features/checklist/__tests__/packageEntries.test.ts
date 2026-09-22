/**
 * Запрос пунктов с документами для сборки пакета.
 *
 * Строки приходят с псевдонимами (`item_id`, `document_id`): `id` есть и
 * у пункта, и у документа, и без псевдонимов одна колонка затирала бы
 * другую. Тест держит имена и читателя в согласии — их расхождение уже
 * один раз превращало «Собрать пакет» в ошибку «не удалось обратиться к
 * данным на устройстве».
 */

import { StorageErrorCode, isStorageError } from '../../../storage/errors';
import type { ApplicationId } from '../model';
import { listPackageEntries } from '../repository';

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

const APP_ID = 'app-1' as ApplicationId;

/** Строка ровно такой формы, какую отдаёт запрос с псевдонимами. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    item_id: 'i1',
    label: 'Паспорт',
    position: 0,
    document_id: 'd1',
    original_filename: 'Паспорт.pdf',
    mime_type: 'application/pdf',
    size_bytes: 2048,
    file_path: 'documents/d1',
    ...overrides,
  };
}

function fakeDb(rows: Rows) {
  return { execute: jest.fn().mockResolvedValue({ rows }) };
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

it('читает пункт и документ по псевдонимам запроса', async () => {
  client.getDb.mockResolvedValue(fakeDb([row()]));

  await expect(listPackageEntries(APP_ID)).resolves.toEqual([
    {
      itemId: 'i1',
      label: 'Паспорт',
      position: 0,
      documents: [
        {
          id: 'd1',
          name: 'Паспорт.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
          filePath: 'documents/d1',
        },
      ],
    },
  ]);
});

it('несколько документов одного пункта собираются в один пункт', async () => {
  client.getDb.mockResolvedValue(
    fakeDb([
      row(),
      row({ document_id: 'd2', original_filename: 'Скан.jpg', mime_type: 'image/jpeg' }),
    ]),
  );

  const entries = await listPackageEntries(APP_ID);

  expect(entries).toHaveLength(1);
  expect(entries[0]?.documents.map(document => document.id)).toEqual([
    'd1',
    'd2',
  ]);
});

it('пункт без документов остаётся в списке с пустым набором', async () => {
  // Такие пункты нужны реестру: «файл не прикреплён» должно быть видно.
  client.getDb.mockResolvedValue(
    fakeDb([
      row({
        item_id: 'i2',
        label: 'Справка',
        position: 1,
        document_id: null,
        original_filename: null,
        mime_type: null,
        size_bytes: null,
        file_path: null,
      }),
    ]),
  );

  await expect(listPackageEntries(APP_ID)).resolves.toEqual([
    { itemId: 'i2', label: 'Справка', position: 1, documents: [] },
  ]);
});

it('порядок пунктов и документов берётся из запроса', async () => {
  client.getDb.mockResolvedValue(
    fakeDb([
      row({ item_id: 'i1', position: 0 }),
      row({ item_id: 'i2', label: 'Фото', position: 1, document_id: 'd2' }),
      row({ item_id: 'i3', label: 'Справка', position: 2, document_id: 'd3' }),
    ]),
  );

  const entries = await listPackageEntries(APP_ID);

  expect(entries.map(entry => entry.itemId)).toEqual(['i1', 'i2', 'i3']);
});

it('запрос идёт по заявке и тянет колонки, нужные сборке', async () => {
  const db = fakeDb([]);
  client.getDb.mockResolvedValue(db);

  await listPackageEntries(APP_ID);

  const [sql, params] = db.execute.mock.calls[0] as unknown as [
    string,
    unknown[],
  ];
  expect(params).toEqual([APP_ID]);
  // Псевдонимы и читатель обязаны совпадать — ровно это и ломалось.
  for (const alias of [
    'AS item_id',
    'AS document_id',
    'AS original_filename',
    'AS mime_type',
    'AS size_bytes',
    'AS file_path',
  ]) {
    expect(sql).toContain(alias);
  }
  expect(sql).toContain('LEFT JOIN checklist_item_documents');
});

it('размер отсутствует — это не ошибка', async () => {
  client.getDb.mockResolvedValue(fakeDb([row({ size_bytes: null })]));

  const entries = await listPackageEntries(APP_ID);

  expect(entries[0]?.documents[0]?.sizeBytes).toBeNull();
});

it('размер неожиданного типа — StorageError, а не мусор в оценке', async () => {
  client.getDb.mockResolvedValue(fakeDb([row({ size_bytes: 'много' })]));

  const error = await failureOf(() => listPackageEntries(APP_ID));
  expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
});
