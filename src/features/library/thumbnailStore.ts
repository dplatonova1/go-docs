/**
 * Файлы миниатюр: `thumbnails/<id документа>`, зашифрованы тем же ключом,
 * что и документы (`storage/fs.ts`). Как миниатюра делается —
 * [`thumbnail.ts`](./thumbnail.ts).
 *
 * В базе о миниатюре ничего нет — там только метаданные (решено
 * 2026-10-05), путь выводится из id документа.
 */

import { StorageError, StorageErrorCode } from '../../storage/errors';
import {
  deleteFile,
  readFile,
  toRelativePath,
  writeFile,
  type RelativePath,
} from '../../storage/fs';
import type { DocumentId } from '../checklist/model';

/** Папка миниатюр в песочнице, рядом с `documents/`. */
const THUMBNAILS_DIR = 'thumbnails';

/** Путь миниатюры документа — выводится из id, в базе его нет. */
export function thumbnailPath(documentId: DocumentId): RelativePath {
  return toRelativePath(`${THUMBNAILS_DIR}/${documentId}`);
}

/**
 * Миниатюра с диска или `null`, если её нет (PDF, сбой разбора, документ
 * прикреплён до миниатюр).
 *
 * @throws ошибки расшифровки и Keychain — не «нет файла».
 */
export async function readThumbnail(
  documentId: DocumentId,
): Promise<Uint8Array | null> {
  try {
    return await readFile(thumbnailPath(documentId));
  } catch (error) {
    if (
      error instanceof StorageError &&
      error.code === StorageErrorCode.FileNotFound
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Записывает миниатюру. Не бросает: без миниатюры документ всё равно
 * документ, в плитке будет заглушка, а миниатюру сделает следующий показ.
 */
export async function saveThumbnail(
  documentId: DocumentId,
  thumbnail: Uint8Array,
): Promise<void> {
  await writeFile(thumbnailPath(documentId), thumbnail).catch(() => undefined);
}

/** Удаляет миниатюру; её отсутствие ошибкой не считается. */
export async function deleteThumbnail(documentId: DocumentId): Promise<void> {
  await deleteFile(thumbnailPath(documentId)).catch(() => undefined);
}
