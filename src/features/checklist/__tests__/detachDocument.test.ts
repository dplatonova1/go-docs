/**
 * Удаление прикреплённого файла: файл стирается только после commit и
 * только если документ больше нигде не используется.
 */

import { StorageError, StorageErrorCode } from '../../../storage/errors';
import { deleteAttachedDocument } from '../detachDocument';
import type { ChecklistItemId, DocumentId } from '../model';

jest.mock('../../../storage/fs', () => ({
  deleteFile: jest.fn(),
  toRelativePath: (value: string) => value,
}));

jest.mock('../repository', () => ({ detachDocumentFromItem: jest.fn() }));

const fs = require('../../../storage/fs');
const repository = require('../repository');

const ITEM_ID = 'item-1' as ChecklistItemId;
const DOCUMENT_ID = 'doc-1' as DocumentId;

let log: string[];

beforeEach(() => {
  jest.resetAllMocks();
  log = [];
  repository.detachDocumentFromItem.mockImplementation(async () => {
    log.push('db');
    return 'documents/doc-1';
  });
  fs.deleteFile.mockImplementation(async (path: string) => {
    log.push(`delete ${path}`);
  });
});

it('сначала транзакция в БД, потом файл', async () => {
  await deleteAttachedDocument(ITEM_ID, DOCUMENT_ID);

  expect(repository.detachDocumentFromItem).toHaveBeenCalledWith(
    ITEM_ID,
    DOCUMENT_ID,
  );
  expect(log).toEqual(['db', 'delete documents/doc-1']);
});

it('документ ещё используется — файл остаётся', async () => {
  repository.detachDocumentFromItem.mockResolvedValue(null);

  await deleteAttachedDocument(ITEM_ID, DOCUMENT_ID);

  expect(fs.deleteFile).not.toHaveBeenCalled();
});

it('транзакция упала — файл не трогаем, ошибка наружу', async () => {
  const failure = new StorageError(StorageErrorCode.DatabaseFailure, 'busy');
  repository.detachDocumentFromItem.mockRejectedValue(failure);

  await expect(deleteAttachedDocument(ITEM_ID, DOCUMENT_ID)).rejects.toBe(
    failure,
  );
  expect(fs.deleteFile).not.toHaveBeenCalled();
});

it('файл не стёрся — для пользователя файл всё равно удалён', async () => {
  fs.deleteFile.mockRejectedValue(new Error('EBUSY'));

  await expect(
    deleteAttachedDocument(ITEM_ID, DOCUMENT_ID),
  ).resolves.toBeUndefined();
});
