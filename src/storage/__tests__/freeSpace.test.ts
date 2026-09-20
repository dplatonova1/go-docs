/**
 * Проверка свободного места перед записью документа.
 *
 * Смысл проверки — превратить «заведомо не хватит» в понятную ошибку до
 * записи, а не получить отказ нативного слоя на середине файла. Гонку
 * она не закрывает: место могут занять между проверкой и записью.
 */

import { StorageErrorCode, isStorageError } from '../errors';
import { assertEnoughSpace } from '../fs';

jest.mock('@dr.pogodin/react-native-fs', () => ({
  DocumentDirectoryPath: '/data/user/0/com.godocs/files',
  exists: jest.fn(),
  getFSInfo: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
}));

// Ключ шифрования тут не нужен: проверка места идёт до шифрования.
jest.mock('../keychain', () => ({ getOrCreateEncryptionKey: jest.fn() }));

const rnfs = require('@dr.pogodin/react-native-fs');

const MEGABYTE = 1024 * 1024;

function freeSpace(bytes: number): void {
  rnfs.getFSInfo.mockResolvedValue({
    totalSpace: 64 * 1024 * MEGABYTE,
    totalSpaceEx: 0,
    freeSpace: bytes,
    freeSpaceEx: 0,
  });
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

it('места с запасом хватает — проходит молча', async () => {
  freeSpace(100 * MEGABYTE);

  await expect(assertEnoughSpace(5 * MEGABYTE)).resolves.toBeUndefined();
});

it('свободно меньше самого файла — понятная ошибка', async () => {
  freeSpace(MEGABYTE);

  const error = await failureOf(() => assertEnoughSpace(5 * MEGABYTE));
  expect(isStorageError(error, StorageErrorCode.NotEnoughSpace)).toBe(true);
});

it('места ровно под файл, но без запаса — тоже отказ', async () => {
  // Сразу после файла в ту же файловую систему пишет SQLite: записать
  // документ и не суметь записать про него строку — худший исход.
  freeSpace(5 * MEGABYTE);

  const error = await failureOf(() => assertEnoughSpace(5 * MEGABYTE));
  expect(isStorageError(error, StorageErrorCode.NotEnoughSpace)).toBe(true);
});

it('система не сказала, сколько свободно — ошибка хранилища, а не тихий проход', async () => {
  rnfs.getFSInfo.mockRejectedValue(new Error('ENOSYS'));

  const error = await failureOf(() => assertEnoughSpace(MEGABYTE));
  expect(isStorageError(error, StorageErrorCode.DatabaseFailure)).toBe(true);
});
