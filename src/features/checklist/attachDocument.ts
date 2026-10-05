/**
 * Прикрепление выбранного файла к пункту чек-листа.
 *
 * 1. Локальная копия выбранного файла — `pickDocument` делает
 *    `keepLocalCopy` сразу при выборе.
 * 2. Копия читается в память и **сразу удаляется** — открытый текст не
 *    должен пережить чтение, чем бы ни закончились следующие шаги.
 * 3. По прочитанным байтам считается SHA-256. Если файл с таким
 *    содержимым уже загружен, всё заканчивается связью в
 *    `checklist_item_documents`: ни второй копии на диске, ни второй
 *    строки в `documents`
 *    ([ADR-0018](../../../docs/adr/0018-deduplicate-documents-by-content-hash.md)).
 * 4. Иначе проверяется свободное место, байты шифруются и пишутся в
 *    `documents/<id>` через `storage/fs`.
 * 5. Одной транзакцией — строка в `documents` и связь с пунктом
 *    (`attachDocumentToItem`). Дедупликация доделывается там же: если
 *    между шагами 3 и 5 такой документ успел появиться, транзакция
 *    создаёт только связь, а лишний файл удаляется здесь.
 *
 * Если шаг 4 или 5 не удался, записанный зашифрованный файл удаляется:
 * файла без строки в БД оставаться не должно.
 *
 * Осознанный компромисс: если процесс приложения прервётся между записью
 * файла и commit транзакции, зашифрованный файл останется на диске без
 * ссылки в БД. Это мусор, а не потеря данных; уборка таких файлов при
 * запуске не реализована (см. «Отложенные обязательства» в CLAUDE.md).
 */

import { newId } from '../../db/ids';
import { contentHashOf } from '../../storage/contentHash';
import {
  assertEnoughSpace,
  deleteFile,
  toRelativePath,
  writeFile,
} from '../../storage/fs';
import { deleteCachedCopy, readCachedCopy } from '../../storage/localCopy';
import {
  MAX_ATTACHMENT_BYTES,
  type AttachedDocument,
  type ChecklistItemId,
  type DocumentId,
} from './model';
import { analyzeImage } from '../library/thumbnail';
import { saveThumbnail } from '../library/thumbnailStore';
import { pickDocument, type PickedDocument } from './pickDocument';
import {
  attachDocumentToItem,
  attachLibraryDocumentToItem,
  findDocumentByContentHash,
} from './repository';

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

/**
 * Чем закончилось прикрепление.
 *
 * `reused` и `already-attached` — это дедупликация: файл уже был в
 * библиотеке. Пользователю о них говорят отдельно, потому что выглядят
 * они иначе, чем обычная загрузка: ничего не копировалось.
 */
export type AttachResult =
  | { readonly status: 'canceled' }
  | { readonly status: 'attached'; readonly document: AttachedDocument }
  | { readonly status: 'reused'; readonly document: AttachedDocument }
  | {
      readonly status: 'already-attached';
      readonly document: AttachedDocument;
    };

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
): Promise<AttachResult> {
  let bytes: Uint8Array;
  try {
    bytes = await readCachedCopy(picked.localUri, MAX_ATTACHMENT_BYTES);
  } finally {
    // Открытый текст не должен пережить этот вызов.
    await deleteCachedCopy(picked.localUri);
  }

  const contentHash = contentHashOf(bytes);

  // Такой файл уже загружен: шифровать и писать нечего, нужна только
  // связь — тот же путь, что у выбора из библиотеки.
  const existing = await findDocumentByContentHash(contentHash);
  if (existing !== null) {
    const result = await attachLibraryDocumentToItem(itemId, existing.id);
    return result === 'already-attached'
      ? { status: 'already-attached', document: existing }
      : { status: 'reused', document: existing };
  }

  const id = newId() as DocumentId;
  // Путь не зависит от имени файла в источнике: оно недоверенное.
  const filePath = toRelativePath(`${DOCUMENTS_DIR}/${id}`);
  const name = sanitizeSourceText(picked.name);

  // До записи, а не после: понятная ошибка вместо отказа нативного слоя
  // на середине файла.
  await assertEnoughSpace(bytes.length);

  // Миниатюра и детектор качества — одним проходом, пока байты уже в
  // памяти: потом для них пришлось бы расшифровывать файл целиком. Не
  // получилось — документ всё равно прикрепляется: в плитке заглушка,
  // пометки о качестве нет.
  const mimeType = sanitizeSourceText(picked.mimeType);
  const { thumbnail, quality } = await analyzeImage(bytes, mimeType);

  let outcome;
  try {
    await writeFile(filePath, bytes);
    outcome = await attachDocumentToItem({
      id,
      itemId,
      filePath,
      originalFilename: name,
      mimeType,
      sizeBytes: bytes.length,
      contentHash,
      qualityFlag: quality,
    });
  } catch (error) {
    // Файл мог записаться целиком или частично, а строки для него нет.
    await deleteQuietly(filePath);
    throw error;
  }

  if (outcome.status === 'created') {
    // Миниатюра — после записи документа в базу: прерванная запись
    // оставит в худшем случае документ без миниатюры, и её сделает
    // первый показ. Сбой записи миниатюры прикрепление не ломает.
    if (thumbnail !== null) {
      await saveThumbnail(id, thumbnail);
    }
    return { status: 'attached', document: outcome.document };
  }

  // Документ с таким содержимым появился между проверкой и транзакцией:
  // в базе остался он, а наш файл — лишняя копия тех же байтов.
  await deleteQuietly(filePath);

  return outcome.status === 'already-attached'
    ? { status: 'already-attached', document: outcome.document }
    : { status: 'reused', document: outcome.document };
}

async function deleteQuietly(filePath: string): Promise<void> {
  try {
    await deleteFile(toRelativePath(filePath));
  } catch {
    // Исходная ошибка важнее: пользователь должен узнать, прикреплён
    // файл или нет. Оставшийся файл — тот же компромисс, что в шапке.
  }
}

export async function pickAndAttachDocument(
  itemId: ChecklistItemId,
): Promise<AttachResult> {
  const picked = await pickDocument();

  if (picked.status === 'canceled') {
    return picked;
  }

  return attachPickedDocument(itemId, picked.document);
}
