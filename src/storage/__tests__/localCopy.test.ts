/**
 * Локальная копия выбранного файла: проверка пути, предел размера,
 * удаление расшифрованной копии.
 *
 * Путь приходит из нативного модуля, но проверяется как недоверенный:
 * ошибка здесь дала бы чтение или удаление файлов вне кэша — например,
 * базы данных в соседнем каталоге.
 */

import { base64ToBytes } from '../base64';
import { StorageErrorCode, isStorageError } from '../errors';
import {
  deleteCachedCopy,
  locateCachedCopy,
  readCachedCopy,
} from '../localCopy';

jest.mock('@dr.pogodin/react-native-fs', () => ({
  CachesDirectoryPath: '/data/user/0/com.godocs/cache',
  exists: jest.fn(),
  readFile: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
}));

const fs = require('@dr.pogodin/react-native-fs');

const ANDROID_CACHE = '/data/user/0/com.godocs/cache';
const COPY_DIR = `${ANDROID_CACHE}/0f3c2b7e-uuid`;
const COPY_URI = `file://${COPY_DIR}/picked-document`;

function failureCode(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return isStorageError(error) ? error.code : 'not-a-storage-error';
  }
  return undefined;
}

beforeEach(() => {
  jest.resetAllMocks();
  fs.CachesDirectoryPath = ANDROID_CACHE;
});

describe('locateCachedCopy', () => {
  it('принимает копию в каталоге <кэш>/<UUID>/', () => {
    expect(locateCachedCopy(COPY_URI)).toEqual({
      filePath: `${COPY_DIR}/picked-document`,
      copyDir: COPY_DIR,
    });
  });

  it('раскодирует percent-encoding (кириллица, пробелы)', () => {
    const uri = `file://${COPY_DIR}/%D0%BF%D0%B0%D1%81%D0%BF%D0%BE%D1%80%D1%82%201.pdf`;
    expect(locateCachedCopy(uri).filePath).toBe(`${COPY_DIR}/паспорт 1.pdf`);
  });

  it('iOS: /private/var и /var — один и тот же каталог', () => {
    fs.CachesDirectoryPath =
      '/var/mobile/Containers/Data/Application/A1/Library/Caches';
    const uri =
      'file:///private/var/mobile/Containers/Data/Application/A1/Library/Caches/UUID/scan.jpg';

    expect(locateCachedCopy(uri).copyDir).toBe(
      '/private/var/mobile/Containers/Data/Application/A1/Library/Caches/UUID',
    );
  });

  it.each([
    ['не file://', `content://com.android.providers/document/42`],
    ['битое percent-encoding', `file://${COPY_DIR}/%E0%A4%A`],
    ['нулевой байт', `file://${COPY_DIR}/a%00.pdf`],
  ])('отвергает некорректный путь: %s', (_name, uri) => {
    expect(failureCode(() => locateCachedCopy(uri))).toBe(
      StorageErrorCode.InvalidPath,
    );
  });

  it.each([
    ['вне кэша', 'file:///data/user/0/com.godocs/files/UUID/godocs.sqlite'],
    ['через ..', `file://${ANDROID_CACHE}/../files/godocs.sqlite`],
    ['через закодированные ..', `file://${ANDROID_CACHE}/%2e%2e/files/x`],
    [
      'соседний каталог с тем же префиксом',
      'file:///data/user/0/com.godocs/cache-evil/UUID/f',
    ],
    ['файл прямо в корне кэша', `file://${ANDROID_CACHE}/picked-document`],
    ['глубже, чем <UUID>/<имя>', `file://${COPY_DIR}/nested/picked-document`],
    ['сам корень кэша', `file://${ANDROID_CACHE}/`],
  ])('отвергает путь за пределами копии: %s', (_name, uri) => {
    expect(failureCode(() => locateCachedCopy(uri))).toBe(
      StorageErrorCode.PathOutsideSandbox,
    );
  });
});

describe('readCachedCopy', () => {
  it('читает байты копии', async () => {
    fs.stat.mockResolvedValue({ size: 3 });
    fs.readFile.mockResolvedValue('AQID');

    await expect(readCachedCopy(COPY_URI, 10)).resolves.toEqual(
      base64ToBytes('AQID'),
    );
    expect(fs.readFile).toHaveBeenCalledWith(
      `${COPY_DIR}/picked-document`,
      'base64',
    );
  });

  it('слишком большой файл не читается в память', async () => {
    fs.stat.mockResolvedValue({ size: 11 });

    const error = await readCachedCopy(COPY_URI, 10).catch((e: unknown) => e);

    expect(isStorageError(error, StorageErrorCode.FileTooLarge)).toBe(true);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('предел проверяется и по фактически прочитанным байтам', async () => {
    fs.stat.mockResolvedValue({ size: 1 });
    fs.readFile.mockResolvedValue('AQIDBA==');

    const error = await readCachedCopy(COPY_URI, 3).catch((e: unknown) => e);

    expect(isStorageError(error, StorageErrorCode.FileTooLarge)).toBe(true);
  });

  it('копии нет — file-not-found', async () => {
    fs.stat.mockRejectedValue(new Error('ENOENT'));

    const error = await readCachedCopy(COPY_URI, 10).catch((e: unknown) => e);

    expect(isStorageError(error, StorageErrorCode.FileNotFound)).toBe(true);
  });

  it('путь вне кэша не читается вовсе', async () => {
    const error = await readCachedCopy(
      'file:///data/user/0/com.godocs/files/UUID/godocs.sqlite',
      10,
    ).catch((e: unknown) => e);

    expect(isStorageError(error, StorageErrorCode.PathOutsideSandbox)).toBe(
      true,
    );
    expect(fs.stat).not.toHaveBeenCalled();
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});

describe('deleteCachedCopy', () => {
  it('удаляет каталог <UUID> целиком', async () => {
    fs.exists.mockResolvedValue(true);

    await deleteCachedCopy(COPY_URI);

    expect(fs.unlink).toHaveBeenCalledWith(COPY_DIR);
  });

  it('путь вне кэша — ничего не удаляет', async () => {
    await deleteCachedCopy(`file://${ANDROID_CACHE}/../files/UUID/x`);

    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it('ошибка удаления не пробрасывается', async () => {
    fs.exists.mockResolvedValue(true);
    fs.unlink.mockRejectedValue(new Error('EBUSY'));

    await expect(deleteCachedCopy(COPY_URI)).resolves.toBeUndefined();
  });
});
