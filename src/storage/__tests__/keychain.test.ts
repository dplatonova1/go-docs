/**
 * Тесты получения ключа шифрования.
 *
 * Это самая ответственная логика в проекте: ошибка в одной ветке —
 * молчаливое создание нового ключа поверх существующего — означает
 * безвозвратную потерю всех документов пользователя (ADR-0008, SEC-003).
 *
 * Нативные зависимости замоканы, проверяется наблюдаемое поведение
 * `getOrCreateEncryptionKey()`, а не внутреннее устройство модуля.
 *
 * Таблица решений, которую покрывают тесты:
 *
 *   ключ в Keychain | отметка на диске | ожидаемое
 *   ----------------|------------------|---------------------------
 *   есть            | есть             | вернуть ключ
 *   есть            | нет              | вернуть ключ + создать отметку
 *   нет             | нет              | создать новый ключ
 *   нет             | есть             | encryption-key-lost
 */

import { StorageErrorCode, isStorageError } from '../errors';
import { getOrCreateEncryptionKey } from '../keychain';

const VALID_KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);

function envelope(key: string, version = 1): string {
  return JSON.stringify({ v: version, k: key });
}

jest.mock('react-native-get-random-values', () => ({}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly' },
  SECURITY_LEVEL: { SECURE_SOFTWARE: 'secureSoftware' },
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'aesGcmNoAuth' },
  getGenericPassword: jest.fn(),
  hasGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
}));

jest.mock('../sandbox', () => ({
  FileEncoding: { Utf8: 'utf8', Base64: 'base64' },
  toRelativePath: (value: string) => value,
  rawExists: jest.fn(),
  rawWrite: jest.fn(),
}));

const keychainLib = require('react-native-keychain');
const sandbox = require('../sandbox');

type Mock = jest.Mock;

/**
 * Вызывает действие РОВНО ОДИН раз: моки здесь с состоянием
 * (`mockResolvedValueOnce`), и повторный вызов пошёл бы по другой ветке.
 */
async function expectFailure(
  action: () => Promise<unknown>,
  code: StorageErrorCode,
): Promise<void> {
  let caught: unknown;
  let threw = false;

  try {
    await action();
  } catch (error) {
    caught = error;
    threw = true;
  }

  expect(threw).toBe(true);
  expect(isStorageError(caught, code)).toBe(true);
}

beforeEach(() => {
  jest.clearAllMocks();

  // Генератор случайности возвращает предсказуемые ненулевые байты.
  (globalThis as { crypto?: unknown }).crypto = {
    getRandomValues: (array: Uint8Array) => {
      array.fill(0xab);
      return array;
    },
  };

  (keychainLib.setGenericPassword as Mock).mockResolvedValue({});
  (sandbox.rawWrite as Mock).mockResolvedValue(undefined);
});

describe('ключ уже есть в Keychain', () => {
  it('возвращает его, когда отметка на месте', async () => {
    (keychainLib.getGenericPassword as Mock).mockResolvedValue({
      password: envelope(VALID_KEY),
    });
    (sandbox.rawExists as Mock).mockResolvedValue(true);

    expect(await getOrCreateEncryptionKey()).toBe(VALID_KEY);
    expect(keychainLib.setGenericPassword).not.toHaveBeenCalled();
  });

  it('восстанавливает пропавшую отметку, не трогая сам ключ', async () => {
    (keychainLib.getGenericPassword as Mock).mockResolvedValue({
      password: envelope(VALID_KEY),
    });
    (sandbox.rawExists as Mock).mockResolvedValue(false);

    expect(await getOrCreateEncryptionKey()).toBe(VALID_KEY);
    expect(sandbox.rawWrite).toHaveBeenCalled();
    expect(keychainLib.setGenericPassword).not.toHaveBeenCalled();
  });
});

describe('ключа в Keychain нет', () => {
  it('создаёт новый на чистом устройстве', async () => {
    (keychainLib.getGenericPassword as Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValue({ password: envelope('ab'.repeat(32)) });
    (keychainLib.hasGenericPassword as Mock).mockResolvedValue(false);
    (sandbox.rawExists as Mock).mockResolvedValue(false);

    expect(await getOrCreateEncryptionKey()).toBe('ab'.repeat(32));
    expect(keychainLib.setGenericPassword).toHaveBeenCalledTimes(1);
    expect(sandbox.rawWrite).toHaveBeenCalled();
  });

  it('НЕ создаёт новый, если отметка говорит, что ключ был', async () => {
    (keychainLib.getGenericPassword as Mock).mockResolvedValue(false);
    (sandbox.rawExists as Mock).mockResolvedValue(true);

    await expectFailure(
      getOrCreateEncryptionKey,
      StorageErrorCode.EncryptionKeyLost,
    );
    expect(keychainLib.setGenericPassword).not.toHaveBeenCalled();
  });

  it('НЕ затирает ключ, который Keychain признаёт существующим (SEC-003)', async () => {
    // Чтение вернуло false, но hasGenericPassword говорит, что запись
    // есть, — значит, это сбой чтения, а не пустое хранилище.
    (keychainLib.getGenericPassword as Mock).mockResolvedValue(false);
    (keychainLib.hasGenericPassword as Mock).mockResolvedValue(true);
    (sandbox.rawExists as Mock).mockResolvedValue(false);

    await expectFailure(
      getOrCreateEncryptionKey,
      StorageErrorCode.KeychainUnavailable,
    );
    expect(keychainLib.setGenericPassword).not.toHaveBeenCalled();
  });
});

describe('сбои', () => {
  it('отличает недоступный Keychain от пустого', async () => {
    (keychainLib.getGenericPassword as Mock).mockRejectedValue(
      new Error('keystore unavailable'),
    );

    await expectFailure(
      getOrCreateEncryptionKey,
      StorageErrorCode.KeychainUnavailable,
    );
    expect(keychainLib.setGenericPassword).not.toHaveBeenCalled();
  });

  it('ловит несовпадение при чтении сразу после записи (ADR-0008)', async () => {
    (keychainLib.getGenericPassword as Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValue({ password: envelope(OTHER_KEY) });
    (keychainLib.hasGenericPassword as Mock).mockResolvedValue(false);
    (sandbox.rawExists as Mock).mockResolvedValue(false);

    await expectFailure(
      getOrCreateEncryptionKey,
      StorageErrorCode.KeychainReadBackFailed,
    );
    // Отметка не ставится: ключ признан ненадёжным.
    expect(sandbox.rawWrite).not.toHaveBeenCalled();
  });

  it('не прикрепляет исходную ошибку записи как cause (SEC-002)', async () => {
    (keychainLib.getGenericPassword as Mock).mockResolvedValue(false);
    (keychainLib.hasGenericPassword as Mock).mockResolvedValue(false);
    (sandbox.rawExists as Mock).mockResolvedValue(false);
    (keychainLib.setGenericPassword as Mock).mockRejectedValue(
      new Error(`native call failed with password=${VALID_KEY}`),
    );

    try {
      await getOrCreateEncryptionKey();
      throw new Error('ожидалась ошибка');
    } catch (error) {
      const serialised = JSON.stringify({
        message: (error as Error).message,
        cause: (error as { cause?: unknown }).cause,
      });
      // Ключ был аргументом упавшего вызова — он не должен просочиться
      // ни в сообщение, ни в cause.
      expect(serialised).not.toContain(VALID_KEY);
    }
  });

  it('считает повреждением мусор вместо конверта', async () => {
    (keychainLib.getGenericPassword as Mock).mockResolvedValue({
      password: 'не json',
    });

    await expectFailure(
      getOrCreateEncryptionKey,
      StorageErrorCode.EncryptionKeyLost,
    );
  });

  it('отличает незнакомую версию формата от повреждения (SEC-007)', async () => {
    (keychainLib.getGenericPassword as Mock).mockResolvedValue({
      password: envelope(VALID_KEY, 99),
    });

    await expectFailure(
      getOrCreateEncryptionKey,
      StorageErrorCode.KeyFormatUnsupported,
    );
  });

  it('отказывается создавать ключ без генератора случайности (SEC-005)', async () => {
    (keychainLib.getGenericPassword as Mock).mockResolvedValue(false);
    (keychainLib.hasGenericPassword as Mock).mockResolvedValue(false);
    (sandbox.rawExists as Mock).mockResolvedValue(false);
    delete (globalThis as { crypto?: unknown }).crypto;

    await expectFailure(
      getOrCreateEncryptionKey,
      StorageErrorCode.CsprngUnavailable,
    );
    expect(keychainLib.setGenericPassword).not.toHaveBeenCalled();
  });

  it('отказывается использовать вырожденный ключ из одних нулей (SEC-006)', async () => {
    (keychainLib.getGenericPassword as Mock).mockResolvedValue(false);
    (keychainLib.hasGenericPassword as Mock).mockResolvedValue(false);
    (sandbox.rawExists as Mock).mockResolvedValue(false);
    (globalThis as { crypto?: unknown }).crypto = {
      getRandomValues: (array: Uint8Array) => {
        array.fill(0);
        return array;
      },
    };

    await expectFailure(
      getOrCreateEncryptionKey,
      StorageErrorCode.CsprngUnavailable,
    );
    expect(keychainLib.setGenericPassword).not.toHaveBeenCalled();
  });
});
