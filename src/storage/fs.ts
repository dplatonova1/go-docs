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
 * Содержимое передаётся и возвращается как base64: документы бинарные
 * (сканы, PDF, docx), а мост между JS и нативным слоем строковый.
 */

import { base64ToBytes, bytesToBase64 } from './base64';
import { decryptBytes, encryptBytes } from './crypto';
import { getOrCreateEncryptionKey } from './keychain';
import {
  FileEncoding,
  rawDelete,
  rawExists,
  rawRead,
  rawWrite,
  type RelativePath,
} from './sandbox';

export { getAppFilesDir, toRelativePath, type RelativePath } from './sandbox';

/**
 * Шифрует и записывает документ.
 *
 * @param content содержимое файла в base64.
 * @returns тот же относительный путь — его и следует сохранить в БД.
 */
export async function saveFile(
  relativePath: RelativePath,
  content: string,
): Promise<RelativePath> {
  const key = await getOrCreateEncryptionKey();
  const encrypted = encryptBytes(base64ToBytes(content), key);

  await rawWrite(relativePath, bytesToBase64(encrypted), FileEncoding.Base64);

  return relativePath;
}

/**
 * Читает и расшифровывает документ.
 *
 * @returns содержимое файла в base64 — ровно то, что было передано в
 *   `saveFile`.
 * @throws StorageError `file-not-found`, `file-corrupted` (файл изменён
 *   или ключ не тот), либо ошибки получения ключа из Keychain.
 */
export async function readFile(
  relativePath: RelativePath,
): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const stored = await rawRead(relativePath, FileEncoding.Base64);

  return bytesToBase64(decryptBytes(base64ToBytes(stored), key));
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
