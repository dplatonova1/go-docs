/**
 * Шифрование содержимого файлов документов.
 *
 * Своих криптографических алгоритмов здесь нет: AES-256-GCM берётся из
 * `@noble/ciphers` (аудированная реализация), случайность — у ОС через
 * `crypto.getRandomValues`. Этот модуль только формирует конверт и
 * следит, чтобы nonce не повторялся.
 *
 * Почему GCM: это AEAD — вместе с шифрованием он даёт проверку
 * целостности. Изменённый или подменённый файл не расшифруется, а не
 * вернёт мусор, который приложение приняло бы за документ.
 *
 * Формат файла на диске:
 *
 *     [1 байт  версия формата]
 *     [12 байт nonce]
 *     [N байт  шифротекст + 16-байтовый тег аутентификации]
 */

import { gcm } from '@noble/ciphers/aes.js';
import { hexToBytes } from '@noble/ciphers/utils.js';

import { StorageError, StorageErrorCode } from './errors';

const FORMAT_VERSION = 1;
const NONCE_LENGTH = 12;
const HEADER_LENGTH = 1 + NONCE_LENGTH;

function requireCsprng(): void {
  if (
    typeof crypto === 'undefined' ||
    typeof crypto.getRandomValues !== 'function'
  ) {
    throw new StorageError(
      StorageErrorCode.CsprngUnavailable,
      'Криптографический генератор случайных чисел недоступен — ' +
        'зашифровать файл нельзя',
    );
  }
}

/**
 * Шифрует содержимое файла.
 *
 * Nonce случайный и свой для каждого вызова. Повторное шифрование одного
 * и того же документа даёт разный результат — так и должно быть: nonce
 * при одном ключе не должен повторяться никогда.
 */
export function encryptBytes(plaintext: Uint8Array, keyHex: string): Uint8Array {
  requireCsprng();

  const key = hexToBytes(keyHex);
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  const ciphertext = gcm(key, nonce).encrypt(plaintext);

  const out = new Uint8Array(HEADER_LENGTH + ciphertext.length);
  out[0] = FORMAT_VERSION;
  out.set(nonce, 1);
  out.set(ciphertext, HEADER_LENGTH);

  return out;
}

/**
 * Расшифровывает содержимое файла.
 *
 * @throws StorageError `file-corrupted`, если файл повреждён, обрезан или
 *   изменён — GCM обнаруживает это по несовпадению тега аутентификации.
 *   Та же ошибка будет при попытке расшифровать чужим ключом.
 */
export function decryptBytes(stored: Uint8Array, keyHex: string): Uint8Array {
  if (stored.length <= HEADER_LENGTH) {
    throw new StorageError(
      StorageErrorCode.FileCorrupted,
      'Файл повреждён: слишком короткий для зашифрованного содержимого',
    );
  }

  const version = stored[0];

  if (version !== FORMAT_VERSION) {
    throw new StorageError(
      StorageErrorCode.FileFormatUnsupported,
      `Файл записан в формате версии ${String(version)}, эта сборка ` +
        `поддерживает ${FORMAT_VERSION}. Данные целы — нужна более новая ` +
        'версия приложения.',
    );
  }

  const nonce = stored.subarray(1, HEADER_LENGTH);
  const ciphertext = stored.subarray(HEADER_LENGTH);
  const key = hexToBytes(keyHex);

  try {
    return gcm(key, nonce).decrypt(ciphertext);
  } catch {
    // Исходную ошибку намеренно не прикрепляем: в неё может попасть
    // содержимое буферов, а это персональные данные пользователя.
    throw new StorageError(
      StorageErrorCode.FileCorrupted,
      'Файл повреждён или зашифрован другим ключом — расшифровать ' +
        'не удалось',
    );
  }
}
