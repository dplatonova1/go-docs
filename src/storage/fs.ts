/**
 * Хранилище документов пользователя — с шифрованием.
 *
 * Единственная точка входа для файлов документов. Остальной код не должен
 * импортировать ни `@dr.pogodin/react-native-fs`, ни [`sandbox.ts`](./sandbox.ts)
 * напрямую: в обход этого модуля файл ляжет на диск открытым текстом.
 *
 * Каждый файл шифруется AES-256-GCM тем же ключом, что и база данных
 * ([ADR-0002](../../docs/adr/0002-local-first-storage.md)). Ключ берётся
 * из Keychain при каждой операции — в модуле он не кэшируется.
 *
 * Содержимое передаётся и возвращается как `Uint8Array`: документы
 * бинарные (сканы, PDF, docx), и байты — их честный тип. Кодирование в
 * base64 для нативного слоя остаётся внутри этого модуля, вызывающему
 * знать о нём не нужно.
 */

import { base64ToBytes, bytesToBase64 } from './base64';
import { decryptBytes, encryptBytes } from './crypto';
import { StorageError, StorageErrorCode } from './errors';
import { getOrCreateEncryptionKey } from './keychain';
import {
  FileEncoding,
  rawDelete,
  rawExists,
  rawFreeSpace,
  rawRead,
  rawWrite,
  type RelativePath,
} from './sandbox';

export { getAppFilesDir, toRelativePath, type RelativePath } from './sandbox';

/**
 * Запас свободного места сверх самого файла.
 *
 * Сразу после файла в ту же файловую систему пишет SQLite — строки
 * `documents` и `checklist_item_documents` вместе с журналом отката.
 * Записать документ и не суметь записать про него строку — худший из
 * исходов, поэтому запас проверяется заранее.
 */
const FREE_SPACE_RESERVE_BYTES = 2 * 1024 * 1024;

/**
 * Проверяет, что файл такого размера есть куда записать.
 *
 * Не гарантия: место могут занять между проверкой и записью. Задача
 * скромнее — превратить «заведомо не хватит» в понятную ошибку вместо
 * невнятного отказа нативного слоя на середине записи.
 *
 * @throws StorageError `not-enough-space`
 */
export async function assertEnoughSpace(byteCount: number): Promise<void> {
  const free = await rawFreeSpace();
  const required = byteCount + FREE_SPACE_RESERVE_BYTES;

  if (free < required) {
    throw new StorageError(
      StorageErrorCode.NotEnoughSpace,
      `Нужно ${required} байт вместе с запасом, свободно ${free}`,
    );
  }
}

/**
 * Шифрует и записывает документ.
 *
 * @returns тот же относительный путь — его и следует сохранить в БД.
 */
export async function writeFile(
  relativePath: RelativePath,
  content: Uint8Array,
): Promise<RelativePath> {
  const key = await getOrCreateEncryptionKey();
  const encrypted = encryptBytes(content, key);

  await rawWrite(relativePath, bytesToBase64(encrypted), FileEncoding.Base64);

  return relativePath;
}

/**
 * Читает и расшифровывает документ.
 *
 * @returns содержимое файла — ровно те байты, что были переданы в
 *   `writeFile`.
 * @throws StorageError `file-not-found`, `file-corrupted` (файл изменён
 *   или ключ не тот), либо ошибки получения ключа из Keychain.
 */
export async function readFile(
  relativePath: RelativePath,
): Promise<Uint8Array> {
  const key = await getOrCreateEncryptionKey();
  const stored = await rawRead(relativePath, FileEncoding.Base64);

  return decryptBytes(base64ToBytes(stored), key);
}

/**
 * Удаляет документ. Отсутствие файла ошибкой не считается — удаление
 * идемпотентно.
 *
 * Внимание: файл удаляется обычным способом, без перезаписи содержимого.
 * На флеш-памяти гарантированно затереть данные всё равно нельзя, но и
 * рассчитывать, что после удаления их физически нет, не стоит.
 */
export async function deleteFile(relativePath: RelativePath): Promise<void> {
  return rawDelete(relativePath);
}

export async function fileExists(
  relativePath: RelativePath,
): Promise<boolean> {
  return rawExists(relativePath);
}
