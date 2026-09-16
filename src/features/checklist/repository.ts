/**
 * Запросы к заявке и её пунктам чек-листа.
 *
 * Фаза 1: активная заявка ровно одна. Экрана со списком заявок нет, и
 * здесь нет ничего, что предполагало бы несколько: создание отказывает,
 * если заявка уже существует.
 *
 * Строки из БД не приводятся к типам через `as`, а проверяются по
 * колонкам. Схема может разойтись с кодом (миграция не доехала,
 * повреждённая база), и тогда лучше внятная `StorageError`, чем
 * `undefined` в заголовке экрана.
 *
 * Производительность (EXPLAIN QUERY PLAN на схеме миграции 1):
 * - пункты заявки — поиск по `idx_checklist_items_application_id` и
 *   сортировка по `position` во временном B-tree. Составной индекс
 *   `(application_id, position)` убрал бы сортировку, но на десятках
 *   строк она неизмерима, а индекс — это миграция и цена каждой записи;
 * - проверка «заявка уже есть» идёт по покрывающему индексу первичного
 *   ключа;
 * - вставка пунктов — отдельный `INSERT` на пункт внутри одной
 *   транзакции: запись на диск одна, на commit, поэтому склеивать их в
 *   многострочный `INSERT` с динамическим числом плейсхолдеров незачем;
 * - «документ только этой заявки» — проход по `documents` с
 *   коррелированными подзапросами по `idx_cid_document_id` и первичному
 *   ключу пунктов. Проверено на 3000 документах: результат верный, план
 *   без полного перебора связей. Документов у пользователя сотни, индекс
 *   под этот запрос не нужен;
 * - прикреплённые документы заявки — поиск пунктов по
 *   `idx_checklist_items_application_id`, связей по левому столбцу
 *   первичного ключа `checklist_item_documents`, документов по первичному
 *   ключу. Сортировка по `attached_at` во временном B-tree — на сотнях
 *   строк неизмерима;
 * - отметка пункта прикреплённым — по первичному ключу;
 * - удаление связи — по составному первичному ключу
 *   `checklist_item_documents`; «есть ли ещё связи у документа» — по
 *   покрывающему `idx_cid_document_id`, «остались ли файлы у пункта» — по
 *   покрывающему первичному ключу. Все четыре запроса точечные.
 */

import { getDb, withTransaction } from '../../db/client';
import { newId } from '../../db/ids';
import { StorageError, StorageErrorCode } from '../../storage/errors';
import { deleteFile, toRelativePath } from '../../storage/fs';
import { ApplicationAlreadyExistsError } from './errors';
import {
  isChecklistItemStatus,
  type Application,
  type ApplicationId,
  type AttachedDocument,
  type ChecklistItem,
  type ChecklistItemId,
  type ChecklistItemStatus,
  type DocumentId,
  type NewApplication,
  type NewDocumentAttachment,
  type ResetImpact,
} from './model';

// Самая ранняя по дате создания: заявка в Фазе 1 одна, а порядок нужен,
// чтобы результат был детерминированным, даже если правило нарушится.
const SELECT_ACTIVE_APPLICATION =
  'SELECT id, title FROM applications ORDER BY created_at, id LIMIT 1';

const SELECT_ANY_APPLICATION = 'SELECT 1 FROM applications LIMIT 1';

const INSERT_APPLICATION =
  'INSERT INTO applications (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)';

const INSERT_CHECKLIST_ITEM =
  'INSERT INTO checklist_items ' +
  '(id, application_id, label, position, created_at, updated_at) ' +
  'VALUES (?, ?, ?, ?, ?, ?)';

const SELECT_CHECKLIST_ITEMS =
  'SELECT id, label, position, status FROM checklist_items ' +
  'WHERE application_id = ? ORDER BY position';

const SELECT_ATTACHED_DOCUMENTS =
  'SELECT cid.checklist_item_id, d.id, d.original_filename ' +
  'FROM checklist_items ci ' +
  'JOIN checklist_item_documents cid ON cid.checklist_item_id = ci.id ' +
  'JOIN documents d ON d.id = cid.document_id ' +
  'WHERE ci.application_id = ? ORDER BY cid.attached_at, d.id';

const INSERT_DOCUMENT =
  'INSERT INTO documents ' +
  '(id, original_filename, file_path, mime_type, size_bytes, created_at, updated_at) ' +
  'VALUES (?, ?, ?, ?, ?, ?, ?)';

const INSERT_CHECKLIST_ITEM_DOCUMENT =
  'INSERT INTO checklist_item_documents ' +
  '(checklist_item_id, document_id, attached_at) VALUES (?, ?, ?)';

// «Готово» (Фаза 2) прикрепление не понижает до «прикреплено».
const MARK_CHECKLIST_ITEM_ATTACHED =
  "UPDATE checklist_items SET status = 'attached', updated_at = ? " +
  "WHERE id = ? AND status = 'pending'";

// Предикаты по ADR-0012. Параметр — id заявки. Ссылка на `documents.id`
// без псевдонима: так один и тот же текст годится и для SELECT, и для
// DELETE.
const LINKED_TO_APPLICATION =
  'EXISTS (SELECT 1 FROM checklist_item_documents cid ' +
  'JOIN checklist_items ci ON ci.id = cid.checklist_item_id ' +
  'WHERE cid.document_id = documents.id AND ci.application_id = ?)';

const LINKED_TO_OTHER_APPLICATIONS =
  'EXISTS (SELECT 1 FROM checklist_item_documents cid ' +
  'JOIN checklist_items ci ON ci.id = cid.checklist_item_id ' +
  'WHERE cid.document_id = documents.id AND ci.application_id <> ?)';

/** Параметры: [id заявки, id заявки]. */
const ONLY_IN_APPLICATION = `${LINKED_TO_APPLICATION} AND NOT ${LINKED_TO_OTHER_APPLICATIONS}`;

/** Параметры: [id заявки, id заявки]. */
const ALSO_IN_OTHER_APPLICATIONS = `${LINKED_TO_APPLICATION} AND ${LINKED_TO_OTHER_APPLICATIONS}`;

const COUNT_CHECKLIST_ITEMS =
  'SELECT COUNT(*) AS count FROM checklist_items WHERE application_id = ?';

const COUNT_DOCUMENTS_ONLY_IN_APPLICATION = `SELECT COUNT(*) AS count FROM documents WHERE ${ONLY_IN_APPLICATION}`;

const COUNT_DOCUMENTS_ALSO_IN_OTHER_APPLICATIONS = `SELECT COUNT(*) AS count FROM documents WHERE ${ALSO_IN_OTHER_APPLICATIONS}`;

const SELECT_DOCUMENT_PATHS_ONLY_IN_APPLICATION = `SELECT file_path FROM documents WHERE ${ONLY_IN_APPLICATION}`;

const DELETE_DOCUMENTS_ONLY_IN_APPLICATION = `DELETE FROM documents WHERE ${ONLY_IN_APPLICATION}`;

const DELETE_APPLICATION = 'DELETE FROM applications WHERE id = ?';

const SELECT_DOCUMENT_PATH = 'SELECT file_path FROM documents WHERE id = ?';

const DELETE_CHECKLIST_ITEM_DOCUMENT =
  'DELETE FROM checklist_item_documents ' +
  'WHERE checklist_item_id = ? AND document_id = ?';

const SELECT_ANY_LINK_OF_DOCUMENT =
  'SELECT 1 FROM checklist_item_documents WHERE document_id = ? LIMIT 1';

const SELECT_ANY_DOCUMENT_OF_ITEM =
  'SELECT 1 FROM checklist_item_documents WHERE checklist_item_id = ? LIMIT 1';

const DELETE_DOCUMENT = 'DELETE FROM documents WHERE id = ?';

// Обратное к MARK_CHECKLIST_ITEM_ATTACHED: «готово» (Фаза 2) не трогаем.
const MARK_CHECKLIST_ITEM_PENDING =
  "UPDATE checklist_items SET status = 'pending', updated_at = ? " +
  "WHERE id = ? AND status = 'attached'";

type Row = Readonly<Record<string, unknown>>;

function malformedRow(table: string, column: string): StorageError {
  return new StorageError(
    StorageErrorCode.DatabaseFailure,
    `Неожиданное значение в ${table}.${column} — схема базы не совпадает с ` +
      'ожидаемой',
  );
}

function readText(row: Row, table: string, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') {
    throw malformedRow(table, column);
  }
  return value;
}

function readNullableText(
  row: Row,
  table: string,
  column: string,
): string | null {
  const value = row[column];
  if (value !== null && typeof value !== 'string') {
    throw malformedRow(table, column);
  }
  return value;
}

function readInteger(row: Row, table: string, column: string): number {
  const value = row[column];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw malformedRow(table, column);
  }
  return value;
}

function readStatus(row: Row): ChecklistItemStatus {
  const value = row.status;
  if (!isChecklistItemStatus(value)) {
    throw malformedRow('checklist_items', 'status');
  }
  return value;
}

function readCount(result: { readonly rows: readonly Row[] }): number {
  const row = result.rows[0];
  if (row === undefined) {
    throw malformedRow('COUNT(*)', 'count');
  }
  return readInteger(row, 'COUNT(*)', 'count');
}

function toApplication(row: Row): Application {
  return {
    id: readText(row, 'applications', 'id') as ApplicationId,
    title: readText(row, 'applications', 'title'),
  };
}

function toChecklistItem(
  row: Row,
  documentsByItem: ReadonlyMap<string, readonly AttachedDocument[]>,
): ChecklistItem {
  const id = readText(row, 'checklist_items', 'id');
  return {
    id: id as ChecklistItemId,
    label: readText(row, 'checklist_items', 'label'),
    position: readInteger(row, 'checklist_items', 'position'),
    status: readStatus(row),
    documents: documentsByItem.get(id) ?? [],
  };
}

function groupDocumentsByItem(
  rows: readonly Row[],
): Map<string, AttachedDocument[]> {
  const byItem = new Map<string, AttachedDocument[]>();
  for (const row of rows) {
    const itemId = readText(
      row,
      'checklist_item_documents',
      'checklist_item_id',
    );
    const documents = byItem.get(itemId) ?? [];
    documents.push({
      id: readText(row, 'documents', 'id') as DocumentId,
      name: readNullableText(row, 'documents', 'original_filename'),
    });
    byItem.set(itemId, documents);
  }
  return byItem;
}

/**
 * Сбои драйвера оборачиваются в `StorageError`, чтобы экран различал
 * причины по коду. Уже типизированные ошибки пропускаются как есть.
 */
async function guarded<T>(message: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (
      error instanceof StorageError ||
      error instanceof ApplicationAlreadyExistsError
    ) {
      throw error;
    }
    throw new StorageError(StorageErrorCode.DatabaseFailure, message, error);
  }
}

/** Активная заявка или `null`, если её ещё не создали. */
export function getActiveApplication(): Promise<Application | null> {
  return guarded('Не удалось прочитать заявку', async () => {
    const db = await getDb();
    const result = await db.execute(SELECT_ACTIVE_APPLICATION);
    const row = result.rows[0];
    return row === undefined ? null : toApplication(row);
  });
}

/**
 * Записывает заявку и её пункты одной транзакцией: заявка без пунктов
 * или половина пунктов в базе не остаются ни при каком сбое.
 *
 * Проверка «заявки ещё нет» — внутри той же транзакции. op-sqlite
 * выполняет транзакции по очереди, поэтому два одновременных вызова не
 * создадут две заявки.
 *
 * @throws ApplicationAlreadyExistsError если заявка уже есть.
 */
export function createApplication(input: NewApplication): Promise<Application> {
  return guarded('Не удалось сохранить заявку', async () => {
    const id = newId() as ApplicationId;
    const now = new Date().toISOString();

    await withTransaction(async tx => {
      const existing = await tx.execute(SELECT_ANY_APPLICATION);
      if (existing.rows.length > 0) {
        throw new ApplicationAlreadyExistsError();
      }

      await tx.execute(INSERT_APPLICATION, [id, input.title, now, now]);

      for (const [position, label] of input.itemLabels.entries()) {
        await tx.execute(INSERT_CHECKLIST_ITEM, [
          newId(),
          id,
          label,
          position,
          now,
          now,
        ]);
      }
    });

    return { id, title: input.title };
  });
}

/**
 * Пункты чек-листа заявки в сохранённом порядке, с прикреплёнными
 * документами.
 *
 * Два запроса — в одной транзакции: прикрепление, закоммиченное между
 * ними, иначе дало бы пункт со статусом «не прикреплено» и файлом.
 */
export function listChecklistItems(
  applicationId: ApplicationId,
): Promise<readonly ChecklistItem[]> {
  return guarded('Не удалось прочитать пункты чек-листа', () =>
    withTransaction(async tx => {
      const items = await tx.execute(SELECT_CHECKLIST_ITEMS, [applicationId]);
      const documents = await tx.execute(SELECT_ATTACHED_DOCUMENTS, [
        applicationId,
      ]);
      const documentsByItem = groupDocumentsByItem(documents.rows);
      return items.rows.map(row => toChecklistItem(row, documentsByItem));
    }),
  );
}

/**
 * Записывает прикреплённый документ одной транзакцией: строка в
 * `documents`, связь с пунктом и отметка пункта прикреплённым. Либо всё,
 * либо ничего — документ без связи в Фазе 1 был бы невидимым (ADR-0012).
 *
 * Зашифрованный файл к этому моменту уже записан; удалить его при ошибке —
 * забота вызывающего (`attachDocument.ts`): транзакция БД файл не
 * откатывает.
 */
export function attachDocumentToItem(
  input: NewDocumentAttachment,
): Promise<void> {
  return guarded('Не удалось сохранить прикреплённый файл', async () => {
    const now = new Date().toISOString();

    await withTransaction(async tx => {
      await tx.execute(INSERT_DOCUMENT, [
        input.id,
        input.originalFilename,
        input.filePath,
        input.mimeType,
        input.sizeBytes,
        now,
        now,
      ]);
      await tx.execute(INSERT_CHECKLIST_ITEM_DOCUMENT, [
        input.itemId,
        input.id,
        now,
      ]);
      await tx.execute(MARK_CHECKLIST_ITEM_ATTACHED, [now, input.itemId]);
    });
  });
}

/**
 * Снимает связь документа с пунктом и, если это была последняя связь,
 * удаляет сам документ.
 *
 * Одной транзакцией: путь файла → удаление связи → удаление документа,
 * если связей не осталось → возврат пункта в «не прикреплено», если у
 * него не осталось файлов. Порядок тот же, что при сбросе заявки: после
 * удаления связи отличить «ничей документ» от чужого было бы нельзя.
 *
 * Документ, оставшийся прикреплённым к другому пункту, не удаляется и его
 * файл не трогается (ADR-0012). В Фазе 1 таких документов не бывает, но
 * код на это не полагается.
 *
 * @returns путь удалённого файла — его стирает вызывающий уже после
 *   commit; `null`, если файл нужно оставить.
 */
export function detachDocumentFromItem(
  itemId: ChecklistItemId,
  documentId: DocumentId,
): Promise<string | null> {
  return guarded('Не удалось удалить прикреплённый файл', () =>
    withTransaction(async tx => {
      const found = await tx.execute(SELECT_DOCUMENT_PATH, [documentId]);
      const row = found.rows[0];
      const filePath =
        row === undefined ? null : readText(row, 'documents', 'file_path');

      await tx.execute(DELETE_CHECKLIST_ITEM_DOCUMENT, [itemId, documentId]);

      const otherLinks = await tx.execute(SELECT_ANY_LINK_OF_DOCUMENT, [
        documentId,
      ]);
      const documentDeleted = otherLinks.rows.length === 0;
      if (documentDeleted) {
        await tx.execute(DELETE_DOCUMENT, [documentId]);
      }

      const remaining = await tx.execute(SELECT_ANY_DOCUMENT_OF_ITEM, [itemId]);
      if (remaining.rows.length === 0) {
        await tx.execute(MARK_CHECKLIST_ITEM_PENDING, [
          new Date().toISOString(),
          itemId,
        ]);
      }

      return documentDeleted ? filePath : null;
    }),
  );
}

/**
 * Что удалит сброс заявки — для диалога подтверждения.
 *
 * Числа информационные: к моменту подтверждения набор документов
 * пересчитывается внутри транзакции `deleteApplication`, а не берётся
 * отсюда.
 */
export function getResetImpact(
  applicationId: ApplicationId,
): Promise<ResetImpact> {
  return guarded('Не удалось подсчитать, что удалит сброс заявки', async () => {
    const db = await getDb();
    const items = await db.execute(COUNT_CHECKLIST_ITEMS, [applicationId]);
    const deleted = await db.execute(COUNT_DOCUMENTS_ONLY_IN_APPLICATION, [
      applicationId,
      applicationId,
    ]);
    const kept = await db.execute(COUNT_DOCUMENTS_ALSO_IN_OTHER_APPLICATIONS, [
      applicationId,
      applicationId,
    ]);

    return {
      itemCount: readCount(items),
      deletedDocumentCount: readCount(deleted),
      keptDocumentCount: readCount(kept),
    };
  });
}

/**
 * Удаляет заявку по ADR-0012.
 *
 * Одной транзакцией: пути файлов документов, прикреплённых только к этой
 * заявке → удаление этих документов → удаление заявки (каскад снимает
 * пункты и оставшиеся связи). Документы удаляются до заявки: после
 * каскада у них не останется связей, и отличить «только этой заявки» от
 * «ничьих» будет нельзя.
 *
 * Файлы стираются только после commit. Наоборот нельзя: сбой после
 * удаления файлов оставил бы строки, указывающие в пустоту.
 */
export async function deleteApplication(
  applicationId: ApplicationId,
): Promise<void> {
  const filePaths = await guarded('Не удалось сбросить заявку', () =>
    withTransaction(async tx => {
      const documents = await tx.execute(
        SELECT_DOCUMENT_PATHS_ONLY_IN_APPLICATION,
        [applicationId, applicationId],
      );
      const paths = documents.rows.map(row =>
        readText(row, 'documents', 'file_path'),
      );

      await tx.execute(DELETE_DOCUMENTS_ONLY_IN_APPLICATION, [
        applicationId,
        applicationId,
      ]);
      await tx.execute(DELETE_APPLICATION, [applicationId]);

      return paths;
    }),
  );

  await deleteFilesAfterCommit(filePaths);
}

/**
 * Ошибка удаления одного файла не прерывает удаление остальных и не
 * превращается в ошибку сброса: заявка в базе уже удалена, и сообщить
 * пользователю «не удалось» было бы неправдой. Оставшийся без строки
 * файл в Фазе 1 так и лежит на диске — уборка при запуске (ADR-0012,
 * раздел 4) осознанно отложена, см. CLAUDE.md.
 */
async function deleteFilesAfterCommit(paths: readonly string[]): Promise<void> {
  for (const path of paths) {
    try {
      await deleteFile(toRelativePath(path));
    } catch {
      // Сознательно без реакции, см. комментарий к функции.
    }
  }
}
