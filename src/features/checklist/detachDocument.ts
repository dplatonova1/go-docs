/**
 * Удаление прикреплённого файла.
 *
 * В Фазе 1 библиотеки документов нет, и документ существует ровно в одном
 * месте, поэтому «открепить» здесь означает удалить: связь, запись в
 * `documents` и зашифрованный файл.
 *
 * Порядок — как при сбросе заявки (ADR-0012, раздел 3): сначала
 * транзакция в БД, затем файл. Обратный порядок оставил бы запись,
 * указывающую на несуществующий файл: такой пункт выглядел бы
 * прикреплённым, а открыть документ было бы нельзя.
 *
 * Обратная сторона порядка — прерывание процесса между commit и удалением
 * файла оставит зашифрованный файл без записи в БД. Это тот же осознанный
 * компромисс Фазы 1, что и при прикреплении: мусор на диске, не потеря
 * данных (см. «Отложенные обязательства» в CLAUDE.md).
 */

import { deleteFile, toRelativePath } from '../../storage/fs';
import type { ChecklistItemId, DocumentId } from './model';
import { detachDocumentFromItem } from './repository';

export async function deleteAttachedDocument(
  itemId: ChecklistItemId,
  documentId: DocumentId,
): Promise<void> {
  const filePath = await detachDocumentFromItem(itemId, documentId);

  // null — документ ещё прикреплён к другому пункту, файл нужен.
  if (filePath === null) {
    return;
  }

  try {
    await deleteFile(toRelativePath(filePath));
  } catch {
    // Записи в БД уже нет, и сказать пользователю «не удалось» было бы
    // неправдой: для него файл удалён и больше не показывается.
  }
}
