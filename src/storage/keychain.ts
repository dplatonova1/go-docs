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
  hasGenericPassword,
  setGenericPassword,
} from 'react-native-keychain';

import { StorageError, StorageErrorCode } from './errors';
// Сырой слой, а не fs.ts: зашифрованный fs.ts сам зависит от этого
// модуля (ему нужен ключ), и импорт fs.ts отсюда дал бы цикл. Отметка
// служебная, персональных данных не содержит — шифровать её нечего.
import {
  FileEncoding,
  rawExists,
  rawWrite,
  toRelativePath,
} from './sandbox';

/** Идентификатор записи в Keychain. Менять нельзя — потеряется доступ к ключу. */
const SERVICE = 'com.godocs.encryption-key';

/** Keychain хранит пару логин/пароль; логин здесь технический, не секрет. */
const ACCOUNT = 'godocs';

/** 32 байта = 256 бит. */
const KEY_LENGTH_BYTES = 32;
const KEY_LENGTH_HEX = KEY_LENGTH_BYTES * 2;

/**
 * Версия формата хранения ключа.
 *
 * Ключ лежит в Keychain не голой строкой, а самоописывающимся конвертом
 * `{"v":1,"k":"<hex>"}`. Это нужно, чтобы смена формата в будущем не
 * читалась старым кодом как «ключ повреждён» — иначе обновление
 * приложения приводило бы к ложной потере данных. Незнакомая версия —
 * это `key-format-unsupported` («обновите приложение»), а не
 * `encryption-key-lost` («всё пропало»).
 */
const KEY_FORMAT_VERSION = 1;

type KeyEnvelope = {
  readonly v: number;
  readonly k: string;
};

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

/**
 * Не даёт исходной ошибке утечь наружу целиком.
 *
 * На пути записи ключа нельзя прикреплять оригинальную ошибку как
 * `cause`: секрет является аргументом вызова, а сообщения ошибок
 * нативного моста иногда содержат аргументы. Оттуда они попали бы в
 * logcat или обработчик ошибок. Наружу отдаём только тип.
 */
function errorKind(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

/**
 * Проверяет, что криптографический генератор на месте.
 *
 * Полифилл ставит `crypto.getRandomValues` при импорте. Если нативная
 * часть не слинкована, обращение упало бы обычным TypeError в обход
 * контракта модуля. Слабый ключ при этом не создаётся — но ошибка должна
 * быть внятной.
 */
function requireCsprng(): void {
  if (
    typeof crypto === 'undefined' ||
    typeof crypto.getRandomValues !== 'function'
  ) {
    throw new StorageError(
      StorageErrorCode.CsprngUnavailable,
      'Криптографический генератор случайных чисел недоступен — ' +
        'ключ шифрования создать нельзя',
    );
  }
}

function generateKeyHex(): string {
  requireCsprng();

  const bytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH_BYTES));

  // Защита в глубину: подменённый или сломанный генератор (например,
  // заглушка в тестах) может вернуть одни нули. Такой ключ формально
  // корректен, но бесполезен, и обнаружить это потом невозможно.
  if (bytes.every((byte) => byte === 0)) {
    throw new StorageError(
      StorageErrorCode.CsprngUnavailable,
      'Генератор случайных чисел вернул вырожденное значение',
    );
  }

  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }

  return hex;
}

function isWellFormedKey(value: string): boolean {
  return value.length === KEY_LENGTH_HEX && /^[0-9a-f]+$/.test(value);
}

function packKey(key: string): string {
  const envelope: KeyEnvelope = { v: KEY_FORMAT_VERSION, k: key };
  return JSON.stringify(envelope);
}

/**
 * Разбирает конверт из Keychain.
 *
 * Разделяет три исхода, которые нельзя путать:
 * - валидный ключ текущей версии;
 * - незнакомая версия формата — данные целы, нужна другая сборка;
 * - мусор — ключ действительно повреждён.
 */
function unpackKey(stored: string): string {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new StorageError(
      StorageErrorCode.EncryptionKeyLost,
      'Ключ шифрования в защищённом хранилище повреждён',
    );
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as KeyEnvelope).v !== 'number'
  ) {
    throw new StorageError(
      StorageErrorCode.EncryptionKeyLost,
      'Ключ шифрования в защищённом хранилище повреждён',
    );
  }

  const envelope = parsed as KeyEnvelope;

  if (envelope.v !== KEY_FORMAT_VERSION) {
    throw new StorageError(
      StorageErrorCode.KeyFormatUnsupported,
      `Ключ сохранён в формате версии ${envelope.v}, эта сборка ` +
        `поддерживает ${KEY_FORMAT_VERSION}. Данные целы — нужна более ` +
        'новая версия приложения.',
    );
  }

  if (typeof envelope.k !== 'string' || !isWellFormedKey(envelope.k)) {
    throw new StorageError(
      StorageErrorCode.EncryptionKeyLost,
      'Ключ шифрования в защищённом хранилище повреждён',
    );
  }

  return envelope.k;
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

  return unpackKey(credentials.password);
}

/**
 * Есть ли вообще запись в Keychain — независимо от того, удалось ли её
 * прочитать.
 *
 * Нужно потому, что `getGenericPassword` возвращает `false` и когда
 * записи нет, и при части сбоев чтения: эти случаи в API склеены. Перед
 * созданием нового ключа нужно убедиться, что мы не затираем
 * существующий, который просто не прочитался.
 */
async function keychainHasEntry(): Promise<boolean> {
  try {
    return await hasGenericPassword({ service: SERVICE });
  } catch (error) {
    throw new StorageError(
      StorageErrorCode.KeychainUnavailable,
      'Защищённое хранилище устройства недоступно',
      error,
    );
  }
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
    await setGenericPassword(ACCOUNT, packKey(key), KEYCHAIN_OPTIONS);
  } catch (error) {
    // ВНИМАНИЕ: исходная ошибка сюда НЕ прикрепляется как cause.
    // Ключ был аргументом этого вызова, а сообщения ошибок нативного
    // моста могут содержать аргументы — тогда секрет ушёл бы в logcat
    // или в обработчик ошибок. Наружу отдаём только тип ошибки.
    throw new StorageError(
      StorageErrorCode.KeychainUnavailable,
      'Не удалось сохранить ключ в защищённом хранилище устройства ' +
        `(${errorKind(error)})`,
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
  await rawWrite(
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
    if (!(await rawExists(KEY_MARKER_PATH))) {
      await rawWrite(
        KEY_MARKER_PATH,
        new Date().toISOString(),
        FileEncoding.Utf8,
      );
    }

    return existing;
  }

  if (await rawExists(KEY_MARKER_PATH)) {
    // ОТЛОЖЕНО ДО ФАЗЫ 1 (SEC-004): отсюда нет выхода — приложение будет
    // падать этой ошибкой при каждом запуске, а с зашифрованной базой не
    // сможет показать даже перечень документов. Нужен явный, осознанный
    // сброс из UI (стереть данные и начать заново) с честным
    // предупреждением, что документы будут потеряны.
    throw new StorageError(
      StorageErrorCode.EncryptionKeyLost,
      'Ключ шифрования пропал из защищённого хранилища устройства. ' +
        'Ранее сохранённые документы расшифровать невозможно.',
    );
  }

  // Файл-отметки нет — но прежде чем создавать ключ, убеждаемся, что в
  // Keychain действительно пусто. `getGenericPassword` возвращает `false`
  // не только когда записи нет, но и при части сбоев чтения; если
  // поверить ему на слово, `setGenericPassword` затрёт существующий ключ
  // и данные будут потеряны безвозвратно.
  //
  // ОТЛОЖЕНО ДО ФАЗЫ 1 (SEC-009): файл-отметка — вторая половина этой
  // защиты, и она хрупкая: лежит открытым текстом и удаляется обычным
  // deleteFile(). Стоит защитить её от случайного удаления.
  if (await keychainHasEntry()) {
    throw new StorageError(
      StorageErrorCode.KeychainUnavailable,
      'Защищённое хранилище сообщает, что ключ есть, но прочитать его ' +
        'не удалось. Создавать новый нельзя — это уничтожило бы доступ ' +
        'к сохранённым документам.',
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
