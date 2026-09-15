/**
 * Прикрепление выбранного файла к пункту чек-листа.
 *
 * 1. Локальная копия выбранного файла — `pickDocument` делает
 *    `keepLocalCopy` сразу при выборе.
 * 2. Копия читается, шифруется и записывается в `documents/<id>` через
 *    `storage/fs`. Сама копия — открытый текст — удаляется сразу после
 *    чтения, чем бы ни закончились следующие шаги.
 * 3. Одной транзакцией — строка в `documents` и связь в
 *    `checklist_item_documents` (`attachDocumentToItem`).
 *
 * Если шаг 2 или 3 не удался, записанный зашифрованный файл удаляется:
 * файла без строки в БД оставаться не должно.
 *
 * Осознанный компромисс Фазы 1: если процесс приложения прервётся между
 * записью файла и commit транзакции, зашифрованный файл останется на диске
 * без ссылки в БД. Это мусор, а не потеря данных; уборка таких файлов при
 * запуске в Фазе 1 не реализуется (см. «Отложенные обязательства» в
 * CLAUDE.md).
 */

import { newId } from '../../db/ids';
import { deleteFile, toRelativePath, writeFile } from '../../storage/fs';
import { deleteCachedCopy, readCachedCopy } from '../../storage/localCopy';
import {
  MAX_ATTACHMENT_BYTES,
  type AttachedDocument,
  type ChecklistItemId,
  type DocumentId,
} from './model';
import { pickDocument, type PickedDocument } from './pickDocument';
import { attachDocumentToItem } from './repository';

/**
 * Каталог зашифрованных файлов документов. Единственное место, где они
 * лежат (ADR-0012, раздел 4): уборка, когда появится, не должна выходить
 * за его пределы.
 */
const DOCUMENTS_DIR = 'documents';

/** Имя и MIME-тип из источника хранятся не длиннее этого (в символах). */
const MAX_STORED_TEXT_LENGTH = 255;

/**
 * Управляющие символы и символы форматирования, включая переключатели
 * направления текста: с невидимым символом U+202E перед «fdp.exe» имя
 * файла отображалось бы как «exe.pdf» и выдавало себя за PDF.
 */
const INVISIBLE_CHARACTERS = /[\p{Cc}\p{Cf}]/gu;

export type AttachResult =
  | { readonly status: 'canceled' }
  | { readonly status: 'attached'; readonly document: AttachedDocument };

/**
 * Имя файла и MIME-тип приходят от стороннего провайдера — недоверенный
 * текст. В SQL они уходят параметрами, но показываются пользователю и
 * попадут в реестр пакета, поэтому очищаются от невидимых символов и
 * ограничиваются по длине.
 */
function sanitizeSourceText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const cleaned = Array.from(value.replace(INVISIBLE_CHARACTERS, '').trim())
    .slice(0, MAX_STORED_TEXT_LENGTH)
    .join('');
  return cleaned.length > 0 ? cleaned : null;
}

export async function attachPickedDocument(
  itemId: ChecklistItemId,
  picked: PickedDocument,
): Promise<AttachedDocument> {
  let bytes: Uint8Array;
  try {
    bytes = await readCachedCopy(picked.localUri, MAX_ATTACHMENT_BYTES);
  } finally {
    // Открытый текст не должен пережить этот вызов.
    await deleteCachedCopy(picked.localUri);
  }

  const id = newId() as DocumentId;
  // Путь не зависит от имени файла в источнике: оно недоверенное.
  const filePath = toRelativePath(`${DOCUMENTS_DIR}/${id}`);
  const name = sanitizeSourceText(picked.name);

  try {
    await writeFile(filePath, bytes);
    await attachDocumentToItem({
      id,
      itemId,
      filePath,
      originalFilename: name,
      mimeType: sanitizeSourceText(picked.mimeType),
      sizeBytes: bytes.length,
    });
  } catch (error) {
    // Файл мог записаться целиком или частично, а строки для него нет.
    try {
      await deleteFile(filePath);
    } catch {
      // Исходная ошибка важнее: пользователь должен узнать, что файл не
      // прикреплён. Оставшийся файл — тот же компромисс, что в шапке.
    }
    throw error;
  }

  return { id, name };
}

export async function pickAndAttachDocument(
  itemId: ChecklistItemId,
): Promise<AttachResult> {
  const picked = await pickDocument();

  if (picked.status === 'canceled') {
    return picked;
  }

  const document = await attachPickedDocument(itemId, picked.document);
  return { status: 'attached', document };
}
