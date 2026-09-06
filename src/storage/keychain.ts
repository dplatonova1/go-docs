/**
 * Ключ шифрования документов: получение и создание.
 *
 * Единственная точка входа к Keychain/Keystore — остальной код не должен
 * импортировать `react-native-keychain` напрямую.
 *
 * Своей криптографии здесь нет и быть не должно:
 * - случайность берётся у операционной системы
 *   (`crypto.getRandomValues` через `react-native-get-random-values`:
 *   `SecRandomCopyBytes` на iOS, `SecureRandom` на Android);
 * - хранение и шифрование самого ключа выполняет
 *   `react-native-keychain` средствами Keychain / Android Keystore.
 *
 * Мы только связываем одно с другим и следим за граничными случаями.
 */

// Импорт ради побочного эффекта: ставит crypto.getRandomValues.
// Должен идти до первого обращения к crypto.
import 'react-native-get-random-values';

import {
  ACCESSIBLE,
  SECURITY_LEVEL,
  STORAGE_TYPE,
  getGenericPassword,
  setGenericPassword,
} from 'react-native-keychain';

import { StorageError, StorageErrorCode } from './errors';
import { FileEncoding, fileExists, saveFile, toRelativePath } from './fs';

/** Идентификатор записи в Keychain. Менять нельзя — потеряется доступ к ключу. */
const SERVICE = 'com.godocs.encryption-key';

/** Keychain хранит пару логин/пароль; логин здесь технический, не секрет. */
const ACCOUNT = 'godocs';

/** 32 байта = 256 бит. */
const KEY_LENGTH_BYTES = 32;
const KEY_LENGTH_HEX = KEY_LENGTH_BYTES * 2;

/**
 * Отметка о том, что ключ когда-либо создавался.
 *
 * Нужна, чтобы отличить два внешне одинаковых состояния «в Keychain
 * ключа нет»:
 *   - первый запуск — ключ надо создать;
 *   - ключ был, но ОС его сбросила — создавать новый НЕЛЬЗЯ, иначе уже
 *     зашифрованные документы станут нечитаемыми навсегда, а приложение
 *     сделает вид, что всё в порядке (ADR-0008).
 *
 * Живёт рядом с данными: если стереть данные приложения, исчезнут и
 * отметка, и зашифрованные файлы — это корректный чистый первый запуск.
 */
const KEY_MARKER_PATH = toRelativePath('.encryption-key-created');

const KEYCHAIN_OPTIONS = {
  service: SERVICE,
  /**
   * Ключ доступен только при разблокированном устройстве и НЕ переносится
   * на новое устройство и в облачные бэкапы — прямое требование ADR-0002
   * («ключ никогда не покидает устройство»). Заодно снимает риск из
   * issue #800, где cloudSync: false игнорировался.
   */
  accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  /**
   * AES-GCM — аутентифицированное шифрование. Вариант AES_CBC объявлен
   * устаревшим и не даёт проверки целостности; AES_GCM (без _NO_AUTH)
   * требовал бы биометрию при каждом обращении — это отдельное продуктовое
   * решение, сейчас не принято.
   */
  storage: STORAGE_TYPE.AES_GCM_NO_AUTH,
  /**
   * Требуем как минимум Android Keystore, без отката на менее защищённое
   * хранилище. SECURE_HARDWARE (TEE) был бы строже, но на части устройств
   * с minSdk 24 недоступен и приводил бы к отказу вместо работы.
   */
  securityLevel: SECURITY_LEVEL.SECURE_SOFTWARE,
} as const;

/** Защита от гонки: параллельные вызовы не должны создать два разных ключа. */
let inFlight: Promise<string> | undefined;

function generateKeyHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH_BYTES));

  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }

  return hex;
}

function isWellFormedKey(value: string): boolean {
  return value.length === KEY_LENGTH_HEX && /^[0-9a-f]+$/.test(value);
}

/**
 * Читает ключ из Keychain.
 *
 * @returns строка ключа либо `null`, если записи нет.
 * @throws StorageError с кодом `keychain-unavailable`, если сам Keychain
 *   недоступен. Это принципиально другой случай, чем «записи нет», и
 *   склеивать их нельзя: во втором случае можно создать ключ, в первом —
 *   ни в коем случае.
 */
async function readStoredKey(): Promise<string | null> {
  let credentials: Awaited<ReturnType<typeof getGenericPassword>>;

  try {
    credentials = await getGenericPassword({ service: SERVICE });
  } catch (error) {
    throw new StorageError(
      StorageErrorCode.KeychainUnavailable,
      'Защищённое хранилище устройства недоступно',
      error,
    );
  }

  if (credentials === false) {
    return null;
  }

  if (!isWellFormedKey(credentials.password)) {
    throw new StorageError(
      StorageErrorCode.EncryptionKeyLost,
      'Ключ шифрования в защищённом хранилище повреждён',
    );
  }

  return credentials.password;
}

/**
 * Записывает ключ и тут же читает обратно, сверяя значение.
 *
 * Проверка обязательна по ADR-0008: у react-native-keychain есть
 * незакрытый баг, при котором сохранённое значение потом не
 * расшифровывается. Лучше узнать об этом сейчас, чем когда пользователь
 * не сможет открыть собранный пакет документов.
 */
async function storeKeyAndVerify(key: string): Promise<void> {
  try {
    await setGenericPassword(ACCOUNT, key, KEYCHAIN_OPTIONS);
  } catch (error) {
    throw new StorageError(
      StorageErrorCode.KeychainUnavailable,
      'Не удалось сохранить ключ в защищённом хранилище устройства',
      error,
    );
  }

  const readBack = await readStoredKey();

  if (readBack !== key) {
    throw new StorageError(
      StorageErrorCode.KeychainReadBackFailed,
      'Ключ сохранён, но прочитать его обратно не удалось — ' +
        'защищённое хранилище на этом устройстве работает некорректно',
    );
  }
}

async function createKey(): Promise<string> {
  const key = generateKeyHex();

  await storeKeyAndVerify(key);
  await saveFile(
    KEY_MARKER_PATH,
    new Date().toISOString(),
    FileEncoding.Utf8,
  );

  return key;
}

async function resolveEncryptionKey(): Promise<string> {
  const existing = await readStoredKey();

  if (existing !== null) {
    // Ключ есть, а отметки нет — например, приложение обновилось с
    // версии, где отметки ещё не было. Восстанавливаем её, чтобы в
    // следующий раз потеря ключа была распознана.
    if (!(await fileExists(KEY_MARKER_PATH))) {
      await saveFile(
        KEY_MARKER_PATH,
        new Date().toISOString(),
        FileEncoding.Utf8,
      );
    }

    return existing;
  }

  if (await fileExists(KEY_MARKER_PATH)) {
    throw new StorageError(
      StorageErrorCode.EncryptionKeyLost,
      'Ключ шифрования пропал из защищённого хранилища устройства. ' +
        'Ранее сохранённые документы расшифровать невозможно.',
    );
  }

  return createKey();
}

/**
 * Возвращает ключ шифрования документов, создавая его при первом запуске.
 *
 * Никогда не возвращает пустое значение: любая нештатная ситуация — это
 * `StorageError` с конкретным кодом, по которому UI решает, что показать
 * пользователю. Особое внимание коду `encryption-key-lost`: он означает,
 * что ранее сохранённые документы недоступны, и сообщить об этом нужно
 * честно, а не молча начинать с чистого листа.
 */
export async function getOrCreateEncryptionKey(): Promise<string> {
  inFlight ??= resolveEncryptionKey().finally(() => {
    inFlight = undefined;
  });

  return inFlight;
}
