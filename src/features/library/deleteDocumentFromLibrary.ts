/**
 * Удаление документа из библиотеки: запись, связи и файл на диске.
 *
 * Это не открепление. Открепление снимает связь документа с одним
 * пунктом и файл не трогает
 * ([ADR-0013](../../../docs/adr/0013-detach-deletes-document-in-phase-1.md),
 * раздел «Обновление»); здесь документ исчезает целиком и пропадает из
 * чек-листов всех заявок, где был прикреплён.
 *
 * Порядок — как везде, где участвует файл (ADR-0012, раздел 3): сначала
 * транзакция в БД, затем файл. Обратный порядок оставил бы запись,
 * указывающую на несуществующий файл: документ был бы виден в
 * библиотеке, а открыть его было бы нельзя.
 *
 * Обратная сторона порядка — прерывание процесса между commit и
 * удалением файла оставит зашифрованный файл без записи в БД. Это тот же
 * принятый компромисс, что и при прикреплении: мусор на диске, а не
 * потеря данных (см. «Отложенные обязательства» в CLAUDE.md).
 */

import { deleteFile, toRelativePath } from '../../storage/fs';
import type { DocumentId } from '../checklist/model';
import { deleteDocument } from '../checklist/repository';
import { deleteThumbnail } from './thumbnailStore';

export async function deleteDocumentFromLibrary(
  documentId: DocumentId,
): Promise<void> {
  const filePath = await deleteDocument(documentId);

  // null — записи уже не было (удалили на другом экране), стирать нечего.
  if (filePath === null) {
    return;
  }

  try {
    await deleteFile(toRelativePath(filePath));
  } catch {
    // Записи в БД уже нет, и сказать пользователю «не удалось» было бы
    // неправдой: для него документ удалён и больше не показывается.
  }

  // Миниатюра — тоже файл (`thumbnails/<id>`), в базе о ней ничего нет.
  // Не бросает: её отсутствие не ошибка.
  await deleteThumbnail(documentId);
}
