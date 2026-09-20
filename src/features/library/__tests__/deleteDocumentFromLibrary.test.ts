/**
 * Удаление документа из библиотеки: транзакция, затем файл.
 *
 * Порядок здесь — не стиль, а требование ADR-0012 (раздел 3): запись,
 * пережившая свой файл, показывала бы в библиотеке документ, который
 * нельзя открыть.
 */

import { StorageError, StorageErrorCode } from '../../../storage/errors';
import type { DocumentId } from '../../checklist/model';
import { deleteDocumentFromLibrary } from '../deleteDocumentFromLibrary';

jest.mock('../../../storage/fs', () => ({
  deleteFile: jest.fn(),
  toRelativePath: (value: string) => value,
}));

jest.mock('../../checklist/repository', () => ({
  deleteDocument: jest.fn(),
}));

const fs = require('../../../storage/fs');
const repository = require('../../checklist/repository');

const DOCUMENT_ID = 'doc-1' as DocumentId;

let log: string[];

beforeEach(() => {
  jest.resetAllMocks();
  log = [];
  repository.deleteDocument.mockImplementation(async () => {
    log.push('db');
    return 'documents/doc-1';
  });
  fs.deleteFile.mockImplementation(async (path: string) => {
    log.push(`delete ${path}`);
  });
});

it('сначала транзакция в БД, потом файл', async () => {
  await deleteDocumentFromLibrary(DOCUMENT_ID);

  expect(repository.deleteDocument).toHaveBeenCalledWith(DOCUMENT_ID);
  expect(log).toEqual(['db', 'delete documents/doc-1']);
});

it('записи уже не было — файл не трогаем', async () => {
  repository.deleteDocument.mockResolvedValue(null);

  await deleteDocumentFromLibrary(DOCUMENT_ID);

  expect(fs.deleteFile).not.toHaveBeenCalled();
});

it('транзакция упала — файл цел, ошибка наружу', async () => {
  const failure = new StorageError(StorageErrorCode.DatabaseFailure, 'busy');
  repository.deleteDocument.mockRejectedValue(failure);

  await expect(deleteDocumentFromLibrary(DOCUMENT_ID)).rejects.toBe(failure);
  expect(fs.deleteFile).not.toHaveBeenCalled();
});

it('файл не стёрся — для пользователя документ всё равно удалён', async () => {
  fs.deleteFile.mockRejectedValue(new Error('EBUSY'));

  await expect(
    deleteDocumentFromLibrary(DOCUMENT_ID),
  ).resolves.toBeUndefined();
});
