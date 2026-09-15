/**
 * Прикрепление файла: порядок шагов и уборка при сбоях.
 *
 * Главные свойства:
 * - расшифрованная копия удаляется при любом исходе;
 * - зашифрованный файл без строки в БД не остаётся, если запись или
 *   транзакция не прошли;
 * - путь файла не зависит от имени из источника.
 */

import { StorageError, StorageErrorCode } from '../../../storage/errors';
import { attachPickedDocument, pickAndAttachDocument } from '../attachDocument';
import type { ChecklistItemId } from '../model';

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

jest.mock('../pickDocument', () => ({ pickDocument: jest.fn() }));

jest.mock('../repository', () => ({ attachDocumentToItem: jest.fn() }));

const ids = require('../../../db/ids');
const fs = require('../../../storage/fs');
const localCopy = require('../../../storage/localCopy');
const { pickDocument } = require('../pickDocument');
const repository = require('../repository');

const ITEM_ID = 'item-1' as ChecklistItemId;
const BYTES = new Uint8Array([1, 2, 3, 4]);
const PICKED = {
  localUri: 'file:///cache/UUID/picked-document',
  name: 'Паспорт.pdf',
  mimeType: 'application/pdf',
};

let log: string[];

beforeEach(() => {
  jest.resetAllMocks();
  log = [];
  ids.newId.mockReturnValue('doc-1');
  localCopy.readCachedCopy.mockImplementation(async () => {
    log.push('read-copy');
    return BYTES;
  });
  localCopy.deleteCachedCopy.mockImplementation(async () => {
    log.push('delete-copy');
  });
  fs.writeFile.mockImplementation(async (path: string) => {
    log.push(`write ${path}`);
  });
  fs.deleteFile.mockImplementation(async (path: string) => {
    log.push(`delete ${path}`);
  });
  repository.attachDocumentToItem.mockImplementation(async () => {
    log.push('db');
  });
});

describe('attachPickedDocument', () => {
  it('копия → удаление копии → шифрованная запись → транзакция в БД', async () => {
    const document = await attachPickedDocument(ITEM_ID, PICKED);

    expect(log).toEqual([
      'read-copy',
      'delete-copy',
      'write documents/doc-1',
      'db',
    ]);
    expect(fs.writeFile).toHaveBeenCalledWith('documents/doc-1', BYTES);
    expect(repository.attachDocumentToItem).toHaveBeenCalledWith({
      id: 'doc-1',
      itemId: ITEM_ID,
      filePath: 'documents/doc-1',
      originalFilename: 'Паспорт.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4,
    });
    expect(document).toEqual({ id: 'doc-1', name: 'Паспорт.pdf' });
  });

  it('копия удаляется, даже если её не удалось прочитать', async () => {
    localCopy.readCachedCopy.mockRejectedValue(
      new StorageError(StorageErrorCode.FileTooLarge, 'большой'),
    );

    await expect(attachPickedDocument(ITEM_ID, PICKED)).rejects.toThrow(
      'большой',
    );

    expect(localCopy.deleteCachedCopy).toHaveBeenCalledWith(PICKED.localUri);
    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(repository.attachDocumentToItem).not.toHaveBeenCalled();
  });

  it('транзакция не прошла — зашифрованный файл удаляется, ошибка наружу', async () => {
    const failure = new StorageError(StorageErrorCode.DatabaseFailure, 'FK');
    repository.attachDocumentToItem.mockRejectedValue(failure);

    await expect(attachPickedDocument(ITEM_ID, PICKED)).rejects.toBe(failure);

    expect(fs.deleteFile).toHaveBeenCalledWith('documents/doc-1');
  });

  it('запись файла упала — частичный файл удаляется, в БД ничего не пишется', async () => {
    fs.writeFile.mockRejectedValue(new Error('ENOSPC'));

    await expect(attachPickedDocument(ITEM_ID, PICKED)).rejects.toThrow(
      'ENOSPC',
    );

    expect(fs.deleteFile).toHaveBeenCalledWith('documents/doc-1');
    expect(repository.attachDocumentToItem).not.toHaveBeenCalled();
  });

  it('сбой уборки не подменяет исходную ошибку', async () => {
    const failure = new StorageError(StorageErrorCode.DatabaseFailure, 'FK');
    repository.attachDocumentToItem.mockRejectedValue(failure);
    fs.deleteFile.mockRejectedValue(new Error('EBUSY'));

    await expect(attachPickedDocument(ITEM_ID, PICKED)).rejects.toBe(failure);
  });

  it('путь файла не зависит от имени из источника', async () => {
    await attachPickedDocument(ITEM_ID, {
      ...PICKED,
      name: '../../godocs.sqlite',
    });

    expect(fs.writeFile).toHaveBeenCalledWith('documents/doc-1', BYTES);
  });

  it('имя из источника очищается от невидимых символов и ограничивается по длине', async () => {
    const rtlOverride = String.fromCharCode(0x202e);
    const bell = String.fromCharCode(7);

    const spoofed = await attachPickedDocument(ITEM_ID, {
      ...PICKED,
      name: `  ${rtlOverride}fdp.exe${bell} `,
    });
    expect(spoofed.name).toBe('fdp.exe');

    const long = await attachPickedDocument(ITEM_ID, {
      ...PICKED,
      name: 'я'.repeat(300),
    });
    expect(long.name).toHaveLength(255);

    const empty = await attachPickedDocument(ITEM_ID, {
      ...PICKED,
      name: `${rtlOverride} `,
      mimeType: null,
    });
    expect(empty.name).toBeNull();
    expect(repository.attachDocumentToItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ originalFilename: null, mimeType: null }),
    );
  });
});

describe('pickAndAttachDocument', () => {
  it('отмена выбора — ничего не читается и не пишется', async () => {
    pickDocument.mockResolvedValue({ status: 'canceled' });

    await expect(pickAndAttachDocument(ITEM_ID)).resolves.toEqual({
      status: 'canceled',
    });
    expect(log).toEqual([]);
  });

  it('выбранный файл прикрепляется', async () => {
    pickDocument.mockResolvedValue({ status: 'picked', document: PICKED });

    await expect(pickAndAttachDocument(ITEM_ID)).resolves.toEqual({
      status: 'attached',
      document: { id: 'doc-1', name: 'Паспорт.pdf' },
    });
  });
});
