/**
 * Прикрепление файла: порядок шагов, дедупликация и уборка при сбоях.
 *
 * Главные свойства:
 * - расшифрованная копия удаляется при любом исходе;
 * - файл с уже известным содержимым не шифруется и не пишется второй раз
 *   (ADR-0018), а место на диске проверяется до записи;
 * - зашифрованный файл без строки в БД не остаётся, если запись или
 *   транзакция не прошли;
 * - путь файла не зависит от имени из источника.
 */

import { contentHashOf } from '../../../storage/contentHash';
import { StorageError, StorageErrorCode } from '../../../storage/errors';
import { attachPickedDocument, pickAndAttachDocument } from '../attachDocument';
import type { ChecklistItemId } from '../model';

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

jest.mock('../pickDocument', () => ({ pickDocument: jest.fn() }));

// Миниатюру делает нативный модуль; здесь проверяется, что она уходит в
// запись документа.
jest.mock('../../library/thumbnail', () => ({
  makeThumbnail: jest.fn(),
}));

jest.mock('../repository', () => ({
  attachDocumentToItem: jest.fn(),
  attachLibraryDocumentToItem: jest.fn(),
  findDocumentByContentHash: jest.fn(),
}));

const ids = require('../../../db/ids');
const fs = require('../../../storage/fs');
const localCopy = require('../../../storage/localCopy');
const { pickDocument } = require('../pickDocument');
const repository = require('../repository');
const { makeThumbnail } = require('../../library/thumbnail');

const THUMBNAIL = new Uint8Array([0xff, 0xd8, 0xff]);

const ITEM_ID = 'item-1' as ChecklistItemId;
const BYTES = new Uint8Array([1, 2, 3, 4]);
const HASH = contentHashOf(BYTES);
const PICKED = {
  localUri: 'file:///cache/UUID/picked-document',
  name: 'Паспорт.pdf',
  mimeType: 'application/pdf',
};
const EXISTING = { id: 'doc-0', name: 'Паспорт (старый).pdf' };

let log: string[];

beforeEach(() => {
  jest.resetAllMocks();
  log = [];
  ids.newId.mockReturnValue('doc-1');
  makeThumbnail.mockResolvedValue(THUMBNAIL);
  localCopy.readCachedCopy.mockImplementation(async () => {
    log.push('read-copy');
    return BYTES;
  });
  localCopy.deleteCachedCopy.mockImplementation(async () => {
    log.push('delete-copy');
  });
  fs.assertEnoughSpace.mockImplementation(async () => {
    log.push('check-space');
  });
  fs.writeFile.mockImplementation(async (path: string) => {
    log.push(`write ${path}`);
  });
  fs.deleteFile.mockImplementation(async (path: string) => {
    log.push(`delete ${path}`);
  });
  repository.findDocumentByContentHash.mockImplementation(async () => {
    log.push('lookup-hash');
    return null;
  });
  repository.attachDocumentToItem.mockImplementation(async () => {
    log.push('db');
    return {
      status: 'created',
      document: { id: 'doc-1', name: 'Паспорт.pdf' },
    };
  });
  repository.attachLibraryDocumentToItem.mockImplementation(async () => {
    log.push('link');
    return 'attached';
  });
});

describe('новый файл', () => {
  it('копия → удаление копии → поиск по хэшу → место → запись → транзакция', async () => {
    const result = await attachPickedDocument(ITEM_ID, PICKED);

    expect(log).toEqual([
      'read-copy',
      'delete-copy',
      'lookup-hash',
      'check-space',
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
      contentHash: HASH,
      thumbnail: THUMBNAIL,
    });
    // Миниатюра — из тех же байтов, что пишутся на диск: файл второй раз
    // не читается.
    expect(makeThumbnail).toHaveBeenCalledWith(BYTES, 'application/pdf');
    expect(result).toEqual({
      status: 'attached',
      document: { id: 'doc-1', name: 'Паспорт.pdf' },
    });
  });

  it('хэш считается по прочитанным байтам, файл второй раз не читается', async () => {
    await attachPickedDocument(ITEM_ID, PICKED);

    expect(localCopy.readCachedCopy).toHaveBeenCalledTimes(1);
    expect(repository.findDocumentByContentHash).toHaveBeenCalledWith(HASH);
  });

  it('места не хватает — понятная ошибка, файл не пишется', async () => {
    const failure = new StorageError(
      StorageErrorCode.NotEnoughSpace,
      'свободно мало',
    );
    fs.assertEnoughSpace.mockRejectedValue(failure);

    await expect(attachPickedDocument(ITEM_ID, PICKED)).rejects.toBe(failure);

    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(repository.attachDocumentToItem).not.toHaveBeenCalled();
  });
});

describe('дедупликация по содержимому', () => {
  it('файл уже в библиотеке — только связь, без шифрования и записи', async () => {
    repository.findDocumentByContentHash.mockImplementation(async () => {
      log.push('lookup-hash');
      return EXISTING;
    });

    const result = await attachPickedDocument(ITEM_ID, PICKED);

    expect(log).toEqual(['read-copy', 'delete-copy', 'lookup-hash', 'link']);
    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(fs.assertEnoughSpace).not.toHaveBeenCalled();
    expect(repository.attachDocumentToItem).not.toHaveBeenCalled();
    expect(repository.attachLibraryDocumentToItem).toHaveBeenCalledWith(
      ITEM_ID,
      'doc-0',
    );
    expect(result).toEqual({ status: 'reused', document: EXISTING });
  });

  it('тот же файл уже прикреплён к этому пункту — отдельный исход', async () => {
    repository.findDocumentByContentHash.mockResolvedValue(EXISTING);
    repository.attachLibraryDocumentToItem.mockResolvedValue(
      'already-attached',
    );

    const result = await attachPickedDocument(ITEM_ID, PICKED);

    expect(result).toEqual({ status: 'already-attached', document: EXISTING });
  });

  it('гонка: запись нашла чужую строку — лишний файл удаляется', async () => {
    // Документ с таким содержимым появился между проверкой и
    // транзакцией: в базе остался он, наш файл — дубликат.
    repository.attachDocumentToItem.mockImplementation(async () => {
      log.push('db');
      return { status: 'reused', document: EXISTING };
    });

    const result = await attachPickedDocument(ITEM_ID, PICKED);

    expect(log).toEqual([
      'read-copy',
      'delete-copy',
      'lookup-hash',
      'check-space',
      'write documents/doc-1',
      'db',
      'delete documents/doc-1',
    ]);
    expect(result).toEqual({ status: 'reused', document: EXISTING });
  });

  it('гонка на уже прикреплённом документе — тоже без лишнего файла', async () => {
    repository.attachDocumentToItem.mockResolvedValue({
      status: 'already-attached',
      document: EXISTING,
    });

    const result = await attachPickedDocument(ITEM_ID, PICKED);

    expect(fs.deleteFile).toHaveBeenCalledWith('documents/doc-1');
    expect(result).toEqual({ status: 'already-attached', document: EXISTING });
  });
});

describe('уборка при сбоях', () => {
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
});

describe('имя из источника', () => {
  it('путь файла не зависит от имени', async () => {
    await attachPickedDocument(ITEM_ID, {
      ...PICKED,
      name: '../../godocs.sqlite',
    });

    expect(fs.writeFile).toHaveBeenCalledWith('documents/doc-1', BYTES);
  });

  it('очищается от невидимых символов и ограничивается по длине', async () => {
    const rtlOverride = String.fromCharCode(0x202e);
    const bell = String.fromCharCode(7);

    await attachPickedDocument(ITEM_ID, {
      ...PICKED,
      name: `  ${rtlOverride}fdp.exe${bell} `,
    });
    expect(repository.attachDocumentToItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ originalFilename: 'fdp.exe' }),
    );

    await attachPickedDocument(ITEM_ID, {
      ...PICKED,
      name: 'я'.repeat(300),
    });
    const [long] = repository.attachDocumentToItem.mock.calls[1] as [
      { originalFilename: string },
    ];
    expect(long.originalFilename).toHaveLength(255);

    await attachPickedDocument(ITEM_ID, {
      ...PICKED,
      name: `${rtlOverride} `,
      mimeType: null,
    });
    expect(repository.attachDocumentToItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ originalFilename: null, mimeType: null }),
    );
  });
});

describe('pickAndAttachDocument', () => {
  it('отмена выбора — ничего не делается', async () => {
    pickDocument.mockResolvedValue({ status: 'canceled' });

    await expect(pickAndAttachDocument(ITEM_ID)).resolves.toEqual({
      status: 'canceled',
    });
    expect(localCopy.readCachedCopy).not.toHaveBeenCalled();
  });

  it('выбранный файл проходит весь путь прикрепления', async () => {
    pickDocument.mockResolvedValue({ status: 'picked', document: PICKED });

    await expect(pickAndAttachDocument(ITEM_ID)).resolves.toEqual({
      status: 'attached',
      document: { id: 'doc-1', name: 'Паспорт.pdf' },
    });
  });
});
