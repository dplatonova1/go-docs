/**
 * Запросы к заявкам и их пунктам чек-листа.
 *
 * Заявок может быть несколько ([ADR-0015](../../../docs/adr/0015-multiple-applications-last-opened.md)).
 * «Активная» — та, которую открывали последней: отметку ставит
 * `markApplicationOpened`, читают `getLastOpenedApplication` и
 * `listApplications`.
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
 * - список заявок и последняя открытая — полный проход по
 *   `applications` с сортировкой во временном B-tree. Заявок у человека
 *   единицы, индекс по `last_opened_at` не заводится (ADR-0015);
 * - заявка по id и отметка «открыта» — по первичному ключу;
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
 * - библиотека документов — полный проход по `documents` с сортировкой
 *   во временном B-tree; отметка «уже прикреплён» — по левому столбцу
 *   первичного ключа `checklist_item_documents`;
 * - «где используется документ» — по `idx_cid_document_id`, дальше по
 *   первичным ключам пунктов и заявок, группировка во временном B-tree
 *   по единицам строк;
 * - удаление документа — точечные запросы по первичному ключу и
 *   `idx_cid_document_id`; статусы правятся только у затронутых пунктов;
 * - открепление — удаление по составному первичному ключу
 *   `checklist_item_documents`, затем «остались ли файлы у пункта» по
 *   левому столбцу того же ключа (запрос покрывающий) и отметка пункта по
 *   первичному ключу. Все три запроса точечные.
 */

import { getDb, withTransaction } from '../../db/client';
import { newId } from '../../db/ids';
import { StorageError, StorageErrorCode } from '../../storage/errors';
import {
  isChecklistItemStatus,
  type Application,
  type ApplicationDeletionImpact,
  type ApplicationId,
  type DocumentAttachOutcome,
  type AttachedDocument,
  type ChecklistItem,
  type ChecklistItemId,
  type ChecklistItemStatus,
  type DocumentId,
  type NewApplication,
  type DocumentUsage,
  type LibraryAttachResult,
  type LibraryDocument,
  type NewDocumentAttachment,
  type NonEmptyText,
  type PackageDocument,
  type PackageEntry,
} from './model';

// Недавние сверху. COALESCE защитный: миграция 2 заполнила колонку у
// существующих строк, а создание заявки пишет её сразу — но полагаться
// на «NULL тут не бывает» в модуле, который проверяет каждую колонку,
// неправильно. `id` — детерминированный разрыв ничьей.
const APPLICATION_ORDER =
  'ORDER BY COALESCE(last_opened_at, created_at) DESC, id DESC';

const SELECT_APPLICATIONS = `SELECT id, title FROM applications ${APPLICATION_ORDER}`;

const SELECT_LAST_OPENED_APPLICATION = `SELECT id, title FROM applications ${APPLICATION_ORDER} LIMIT 1`;

const SELECT_APPLICATION_BY_ID =
  'SELECT id, title FROM applications WHERE id = ?';

const MARK_APPLICATION_OPENED =
  'UPDATE applications SET last_opened_at = ? WHERE id = ?';

const RENAME_APPLICATION =
  'UPDATE applications SET title = ?, updated_at = ? WHERE id = ?';

const INSERT_APPLICATION =
  'INSERT INTO applications (id, title, created_at, updated_at, last_opened_at) ' +
  'VALUES (?, ?, ?, ?, ?)';

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

/**
 * `OR IGNORE` — страховка от гонки с уникальным индексом по
 * `content_hash`: документ с таким содержимым мог появиться между
 * проверкой и вставкой. Вместо исключения строка просто не добавляется,
 * а кто именно теперь лежит в базе, выясняет следующий запрос.
 */
const INSERT_DOCUMENT =
  'INSERT OR IGNORE INTO documents ' +
  '(id, original_filename, file_path, mime_type, size_bytes, content_hash, created_at, updated_at) ' +
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

/** Поиск уже загруженного файла по отпечатку содержимого. */
const SELECT_DOCUMENT_BY_CONTENT_HASH =
  'SELECT id, original_filename FROM documents WHERE content_hash = ?';

const INSERT_CHECKLIST_ITEM_DOCUMENT =
  'INSERT INTO checklist_item_documents ' +
  '(checklist_item_id, document_id, attached_at) VALUES (?, ?, ?)';

// «Готово» (Фаза 2) прикрепление не понижает до «прикреплено».
const MARK_CHECKLIST_ITEM_ATTACHED =
  "UPDATE checklist_items SET status = 'attached', updated_at = ? " +
  "WHERE id = ? AND status = 'pending'";

const COUNT_CHECKLIST_ITEMS =
  'SELECT COUNT(*) AS count FROM checklist_items WHERE application_id = ?';

/**
 * Сколько документов прикреплено к пунктам заявки. Параметр — id заявки.
 *
 * Считаются документы, а не связи: один документ, прикреплённый к трём
 * пунктам, для пользователя один файл. Ссылка на `documents.id` без
 * псевдонима — подзапрос вложен в `SELECT ... FROM documents`.
 */
const COUNT_DOCUMENTS_OF_APPLICATION =
  'SELECT COUNT(*) AS count FROM documents WHERE EXISTS (' +
  'SELECT 1 FROM checklist_item_documents cid ' +
  'JOIN checklist_items ci ON ci.id = cid.checklist_item_id ' +
  'WHERE cid.document_id = documents.id AND ci.application_id = ?)';

const DELETE_APPLICATION = 'DELETE FROM applications WHERE id = ?';

/**
 * Всё, что нужно сборке пакета, одним запросом: пункты заявки по
 * порядку и их документы с типом, размером и путём.
 *
 * `LEFT JOIN` — чтобы пункты без файлов тоже попали в результат: в
 * реестре они значатся как «файл не прикреплён».
 *
 * План: пункты по `idx_checklist_items_application_id`, связи по левому
 * столбцу первичного ключа `checklist_item_documents`, документы по
 * первичному ключу. Сортировка во временном B-tree — пунктов десятки.
 */
const SELECT_PACKAGE_ENTRIES =
  'SELECT ci.id AS item_id, ci.label AS label, ci.position AS position, ' +
  'd.id AS document_id, d.original_filename AS original_filename, ' +
  'd.mime_type AS mime_type, d.size_bytes AS size_bytes, ' +
  'd.file_path AS file_path ' +
  'FROM checklist_items ci ' +
  'LEFT JOIN checklist_item_documents cid ON cid.checklist_item_id = ci.id ' +
  'LEFT JOIN documents d ON d.id = cid.document_id ' +
  'WHERE ci.application_id = ? ' +
  'ORDER BY ci.position, cid.attached_at, d.id';

// Библиотека документов. Сортировка — новые сверху: последнее, что
// загрузили, почти всегда и нужно.
const SELECT_LIBRARY_DOCUMENTS =
  'SELECT id, original_filename, mime_type, size_bytes, file_path, created_at ' +
  'FROM documents ORDER BY created_at DESC, id DESC';

const SELECT_DOCUMENT_IDS_OF_ITEM =
  'SELECT document_id FROM checklist_item_documents WHERE checklist_item_id = ?';

/**
 * Где используется документ — по заявке на строку.
 *
 * Идёт по `idx_cid_document_id`, дальше по первичным ключам пунктов и
 * заявок. Группировка по заявке во временном B-tree: строк здесь
 * столько, в скольких пунктах лежит один документ, то есть единицы.
 */
const SELECT_DOCUMENT_USAGE =
  'SELECT a.title AS title, COUNT(*) AS count ' +
  'FROM checklist_item_documents cid ' +
  'JOIN checklist_items ci ON ci.id = cid.checklist_item_id ' +
  'JOIN applications a ON a.id = ci.application_id ' +
  'WHERE cid.document_id = ? ' +
  'GROUP BY a.id, a.title ORDER BY a.title';

const SELECT_ITEM_IDS_OF_DOCUMENT =
  'SELECT checklist_item_id FROM checklist_item_documents WHERE document_id = ?';

const SELECT_DOCUMENT_FILE_PATH =
  'SELECT file_path FROM documents WHERE id = ?';

const DELETE_DOCUMENT = 'DELETE FROM documents WHERE id = ?';

const SELECT_LINK =
  'SELECT 1 FROM checklist_item_documents ' +
  'WHERE checklist_item_id = ? AND document_id = ? LIMIT 1';

const DELETE_CHECKLIST_ITEM_DOCUMENT =
  'DELETE FROM checklist_item_documents ' +
  'WHERE checklist_item_id = ? AND document_id = ?';

const SELECT_ANY_DOCUMENT_OF_ITEM =
  'SELECT 1 FROM checklist_item_documents WHERE checklist_item_id = ? LIMIT 1';

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

function toLibraryDocument(
  row: Row,
  attachedIds: ReadonlySet<string>,
): LibraryDocument {
  const id = readText(row, 'documents', 'id');
  const size = row.size_bytes;

  if (size !== null && (typeof size !== 'number' || !Number.isInteger(size))) {
    throw malformedRow('documents', 'size_bytes');
  }

  return {
    id: id as DocumentId,
    name: readNullableText(row, 'documents', 'original_filename'),
    mimeType: readNullableText(row, 'documents', 'mime_type'),
    sizeBytes: size,
    createdAt: readText(row, 'documents', 'created_at'),
    filePath: readText(row, 'documents', 'file_path'),
    isAttachedToItem: attachedIds.has(id),
  };
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
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(StorageErrorCode.DatabaseFailure, message, error);
  }
}

/** Все заявки, недавно открытые сверху. Пустой список — заявок ещё нет. */
export function listApplications(): Promise<readonly Application[]> {
  return guarded('Не удалось прочитать список заявок', async () => {
    const db = await getDb();
    const result = await db.execute(SELECT_APPLICATIONS);
    return result.rows.map(toApplication);
  });
}

/**
 * Заявка, которую открывали последней, — её приложение показывает при
 * запуске (ADR-0015). `null`, если заявок ещё нет.
 */
export function getLastOpenedApplication(): Promise<Application | null> {
  return guarded('Не удалось прочитать заявку', async () => {
    const db = await getDb();
    const result = await db.execute(SELECT_LAST_OPENED_APPLICATION);
    const row = result.rows[0];
    return row === undefined ? null : toApplication(row);
  });
}

/**
 * Заявка по идентификатору или `null`, если её нет.
 *
 * `null` — обычное дело, а не сбой: восстановленное состояние навигации
 * переживает выгрузку процесса и может указывать на заявку, удалённую с
 * другого экрана.
 */
export function getApplicationById(
  applicationId: ApplicationId,
): Promise<Application | null> {
  return guarded('Не удалось прочитать заявку', async () => {
    const db = await getDb();
    const result = await db.execute(SELECT_APPLICATION_BY_ID, [applicationId]);
    const row = result.rows[0];
    return row === undefined ? null : toApplication(row);
  });
}

/**
 * Отмечает заявку открытой — от этой отметки зависит, что показать при
 * следующем запуске и в каком порядке идёт список заявок.
 *
 * Вызывающий не обязан ждать результат и не должен показывать ошибку:
 * потерянная отметка означает лишь другой порядок в списке, и ронять из-за
 * неё открытый чек-лист нельзя (ADR-0015).
 */
export function markApplicationOpened(
  applicationId: ApplicationId,
): Promise<void> {
  return guarded('Не удалось отметить заявку открытой', async () => {
    const db = await getDb();
    await db.execute(MARK_APPLICATION_OPENED, [
      new Date().toISOString(),
      applicationId,
    ]);
  });
}

/**
 * Записывает заявку и её пункты одной транзакцией: заявка без пунктов
 * или половина пунктов в базе не остаются ни при каком сбое.
 *
 * Созданная заявка сразу считается последней открытой — на неё и
 * переходит приложение.
 *
 * Одноимённые заявки не запрещены: название человек пишет сам, и
 * «ВНЖ Сербия» для двух членов семьи — нормальный случай.
 */
export function createApplication(input: NewApplication): Promise<Application> {
  return guarded('Не удалось сохранить заявку', async () => {
    const id = newId() as ApplicationId;
    const now = new Date().toISOString();

    await withTransaction(async tx => {
      await tx.execute(INSERT_APPLICATION, [id, input.title, now, now, now]);

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
 * Ищет уже загруженный документ с таким же содержимым.
 *
 * Вызывается до шифрования и записи файла: если такой документ есть,
 * писать на диск нечего — достаточно связи
 * ([ADR-0018](../../../docs/adr/0018-deduplicate-documents-by-content-hash.md)).
 *
 * Поиск по уникальному индексу `idx_documents_content_hash`.
 */
export function findDocumentByContentHash(
  contentHash: string,
): Promise<AttachedDocument | null> {
  return guarded('Не удалось проверить, есть ли такой файл', async () => {
    const db = await getDb();
    const result = await db.execute(SELECT_DOCUMENT_BY_CONTENT_HASH, [
      contentHash,
    ]);
    const row = result.rows[0];

    return row === undefined
      ? null
      : {
          id: readText(row, 'documents', 'id') as DocumentId,
          name: readNullableText(row, 'documents', 'original_filename'),
        };
  });
}

/**
 * Записывает прикреплённый документ одной транзакцией: строка в
 * `documents`, связь с пунктом и отметка пункта прикреплённым. Либо всё,
 * либо ничего.
 *
 * Дедупликация по содержимому доделывается здесь, внутри транзакции:
 * вставка идёт `INSERT OR IGNORE`, и следующий запрос показывает, чья
 * строка теперь в базе — наша или уже существовавшая. Так гонка с
 * уникальным индексом по `content_hash` не превращается в исключение и
 * не оставляет пункт без файла.
 *
 * Зашифрованный файл к этому моменту уже записан; удалить его при ошибке
 * или при `reused` — забота вызывающего (`attachDocument.ts`):
 * транзакция БД файл не откатывает.
 */
export function attachDocumentToItem(
  input: NewDocumentAttachment,
): Promise<DocumentAttachOutcome> {
  return guarded('Не удалось сохранить прикреплённый файл', async () => {
    const now = new Date().toISOString();

    return withTransaction(async tx => {
      await tx.execute(INSERT_DOCUMENT, [
        input.id,
        input.originalFilename,
        input.filePath,
        input.mimeType,
        input.sizeBytes,
        input.contentHash,
        now,
        now,
      ]);

      const stored = await tx.execute(SELECT_DOCUMENT_BY_CONTENT_HASH, [
        input.contentHash,
      ]);
      const row = stored.rows[0];

      if (row === undefined) {
        // Вставку проигнорировали, но документа с таким отпечатком нет:
        // значит, конфликт был по другому ограничению, и молчать об этом
        // нельзя — пункт остался бы без файла.
        throw new StorageError(
          StorageErrorCode.DatabaseFailure,
          'Документ не записан и не найден по отпечатку содержимого',
        );
      }

      const document: AttachedDocument = {
        id: readText(row, 'documents', 'id') as DocumentId,
        name: readNullableText(row, 'documents', 'original_filename'),
      };
      const created = document.id === input.id;

      const existingLink = await tx.execute(SELECT_LINK, [
        input.itemId,
        document.id,
      ]);
      if (existingLink.rows.length > 0) {
        return { status: 'already-attached', document };
      }

      await tx.execute(INSERT_CHECKLIST_ITEM_DOCUMENT, [
        input.itemId,
        document.id,
        now,
      ]);
      await tx.execute(MARK_CHECKLIST_ITEM_ATTACHED, [now, input.itemId]);

      return { status: created ? 'created' : 'reused', document };
    });
  });
}

/**
 * Открепляет документ от пункта: снимает связь в
 * `checklist_item_documents` и больше ничего.
 *
 * Запись в `documents` и зашифрованный файл остаются — документ
 * принадлежит библиотеке пользователя, а не пункту
 * ([ADR-0010](../../../docs/adr/0010-shared-document-library.md)). Это
 * изначально спроектированное поведение, возвращённое в Фазе 2 взамен
 * временного «открепление = удаление» из
 * [ADR-0013](../../../docs/adr/0013-detach-deletes-document-in-phase-1.md).
 *
 * Одной транзакцией: удаление связи → возврат пункта в «не прикреплено»,
 * если у него не осталось файлов. Файлы на диске не трогаются вообще,
 * поэтому порядок «сначала БД, потом файл» из ADR-0012 здесь больше не
 * нужен.
 *
 * Известное следствие, пока нет экрана библиотеки: документ, у которого
 * не осталось ни одной связи, не показывается нигде и не удаляется даже
 * при сбросе заявки — см. «Отложенные обязательства» в CLAUDE.md.
 */
export function detachDocumentFromItem(
  itemId: ChecklistItemId,
  documentId: DocumentId,
): Promise<void> {
  return guarded('Не удалось открепить файл', () =>
    withTransaction(async tx => {
      await tx.execute(DELETE_CHECKLIST_ITEM_DOCUMENT, [itemId, documentId]);

      const remaining = await tx.execute(SELECT_ANY_DOCUMENT_OF_ITEM, [itemId]);
      if (remaining.rows.length === 0) {
        await tx.execute(MARK_CHECKLIST_ITEM_PENDING, [
          new Date().toISOString(),
          itemId,
        ]);
      }
    }),
  );
}

/**
 * Пункты заявки с документами — для сборки пакета.
 *
 * Отличается от `listChecklistItems` тем, что отдаёт путь к файлу, тип и
 * размер: сборке нужно читать файлы и заранее прикинуть размер
 * результата.
 */
export function listPackageEntries(
  applicationId: ApplicationId,
): Promise<readonly PackageEntry[]> {
  return guarded('Не удалось прочитать пункты чек-листа', async () => {
    const db = await getDb();
    const result = await db.execute(SELECT_PACKAGE_ENTRIES, [applicationId]);

    const entries: PackageEntry[] = [];
    const byItem = new Map<string, PackageDocument[]>();

    for (const row of result.rows) {
      // Имена колонок — псевдонимы из запроса: `id` есть и у пункта, и у
      // документа, и без псевдонимов одна колонка затирала бы другую.
      const itemId = readText(row, 'checklist_items', 'item_id');
      let documents = byItem.get(itemId);

      if (documents === undefined) {
        documents = [];
        byItem.set(itemId, documents);
        entries.push({
          itemId: itemId as ChecklistItemId,
          label: readText(row, 'checklist_items', 'label'),
          position: readInteger(row, 'checklist_items', 'position'),
          documents,
        });
      }

      // У пункта без файлов колонки документа пустые — это не строка
      // документа, а сам пункт.
      if (row.document_id === null || row.document_id === undefined) {
        continue;
      }

      const size = row.size_bytes;
      if (
        size !== null &&
        (typeof size !== 'number' || !Number.isInteger(size))
      ) {
        throw malformedRow('documents', 'size_bytes');
      }

      documents.push({
        id: readText(row, 'documents', 'document_id') as DocumentId,
        name: readNullableText(row, 'documents', 'original_filename'),
        mimeType: readNullableText(row, 'documents', 'mime_type'),
        sizeBytes: size,
        filePath: readText(row, 'documents', 'file_path'),
      });
    }

    return entries;
  });
}

/**
 * Документы библиотеки — все записи `documents`, новые сверху.
 *
 * `itemId` не `null` — библиотека открыта, чтобы выбрать файл для этого
 * пункта: тогда у каждого документа проставляется `isAttachedToItem`, и
 * экран не предлагает прикрепить то, что уже прикреплено. Оба запроса в
 * одной транзакции: прикрепление, закоммиченное между ними, иначе дало
 * бы документ без отметки.
 *
 * Полный проход по `documents` с сортировкой во временном B-tree.
 * Документов у пользователя сотни — индекс под эту сортировку не нужен,
 * а стоил бы записи при каждом прикреплении.
 */
export function listLibraryDocuments(
  itemId: ChecklistItemId | null,
): Promise<readonly LibraryDocument[]> {
  return guarded('Не удалось прочитать библиотеку документов', () =>
    withTransaction(async tx => {
      const attachedIds = new Set<string>();

      if (itemId !== null) {
        const links = await tx.execute(SELECT_DOCUMENT_IDS_OF_ITEM, [itemId]);
        for (const row of links.rows) {
          attachedIds.add(
            readText(row, 'checklist_item_documents', 'document_id'),
          );
        }
      }

      const documents = await tx.execute(SELECT_LIBRARY_DOCUMENTS);
      return documents.rows.map(row => toLibraryDocument(row, attachedIds));
    }),
  );
}

/**
 * В каких заявках и скольких пунктах используется документ.
 *
 * Нужно до удаления из библиотеки: удаление снимет документ со всех этих
 * пунктов, и пользователь должен увидеть, каких именно
 * ([ADR-0010](../../../docs/adr/0010-shared-document-library.md)).
 */
export function getDocumentUsage(
  documentId: DocumentId,
): Promise<DocumentUsage> {
  return guarded('Не удалось посчитать, где используется документ', async () => {
    const db = await getDb();
    const result = await db.execute(SELECT_DOCUMENT_USAGE, [documentId]);

    const applications = result.rows.map(row => ({
      applicationTitle: readText(row, 'applications', 'title'),
      itemCount: readInteger(row, 'COUNT(*)', 'count'),
    }));

    return {
      itemCount: applications.reduce((sum, row) => sum + row.itemCount, 0),
      applications,
    };
  });
}

/**
 * Прикрепляет к пункту документ, который уже есть в библиотеке.
 *
 * Файл не читается и не копируется — появляется только связь в
 * `checklist_item_documents`. Ради этого документы и сделаны общей
 * библиотекой: один скан закрывает пункты в разных заявках.
 *
 * Повторное прикрепление не ошибка хранилища, а нормальный исход гонки
 * (два нажатия, открытая в двух местах библиотека), поэтому возвращается
 * значением, а не исключением.
 */
export function attachLibraryDocumentToItem(
  itemId: ChecklistItemId,
  documentId: DocumentId,
): Promise<LibraryAttachResult> {
  return guarded('Не удалось прикрепить документ из библиотеки', () =>
    withTransaction(async tx => {
      const existing = await tx.execute(SELECT_LINK, [itemId, documentId]);
      if (existing.rows.length > 0) {
        return 'already-attached';
      }

      const now = new Date().toISOString();
      await tx.execute(INSERT_CHECKLIST_ITEM_DOCUMENT, [
        itemId,
        documentId,
        now,
      ]);
      await tx.execute(MARK_CHECKLIST_ITEM_ATTACHED, [now, itemId]);

      return 'attached';
    }),
  );
}

/**
 * Удаляет документ из библиотеки: запись и все её связи с пунктами.
 *
 * Одной транзакцией: путь файла → пункты, которые держатся на этом
 * документе → удаление записи (каскад снимает связи) → возврат в «не
 * прикреплено» тем пунктам, у которых не осталось файлов. Порядок
 * важен: после каскада узнать, какие пункты затронуты, уже нельзя.
 *
 * Файл стирается после commit — этим занимается вызывающий
 * (`deleteDocumentFromLibrary`). Наоборот нельзя: сбой после удаления
 * файла оставил бы запись, указывающую в пустоту (ADR-0012, раздел 3).
 *
 * @returns путь удалённого файла или `null`, если записи уже не было.
 */
export function deleteDocument(
  documentId: DocumentId,
): Promise<string | null> {
  return guarded('Не удалось удалить документ', () =>
    withTransaction(async tx => {
      const found = await tx.execute(SELECT_DOCUMENT_FILE_PATH, [documentId]);
      const row = found.rows[0];
      if (row === undefined) {
        return null;
      }
      const filePath = readText(row, 'documents', 'file_path');

      const links = await tx.execute(SELECT_ITEM_IDS_OF_DOCUMENT, [documentId]);
      const itemIds = links.rows.map(link =>
        readText(link, 'checklist_item_documents', 'checklist_item_id'),
      );

      await tx.execute(DELETE_DOCUMENT, [documentId]);

      const now = new Date().toISOString();
      for (const itemId of itemIds) {
        const remaining = await tx.execute(SELECT_ANY_DOCUMENT_OF_ITEM, [
          itemId,
        ]);
        if (remaining.rows.length === 0) {
          await tx.execute(MARK_CHECKLIST_ITEM_PENDING, [now, itemId]);
        }
      }

      return filePath;
    }),
  );
}

/**
 * Что произойдёт при удалении заявки — для диалога подтверждения.
 *
 * Числа информационные: удаление опирается на каскад, а не на них.
 */
export function getApplicationDeletionImpact(
  applicationId: ApplicationId,
): Promise<ApplicationDeletionImpact> {
  return guarded(
    'Не удалось подсчитать, что удалит удаление заявки',
    async () => {
      const db = await getDb();
      const items = await db.execute(COUNT_CHECKLIST_ITEMS, [applicationId]);
      const documents = await db.execute(COUNT_DOCUMENTS_OF_APPLICATION, [
        applicationId,
      ]);

      return {
        itemCount: readCount(items),
        documentCount: readCount(documents),
      };
    },
  );
}

/**
 * Удаляет заявку: её саму, её пункты и связи пунктов с документами.
 *
 * Документы и их файлы не трогаются
 * ([ADR-0016](../../../docs/adr/0016-application-deletion-keeps-documents.md)):
 * документ принадлежит библиотеке пользователя, а не заявке, и
 * понадобится в следующей.
 *
 * Один оператор: пункты и связи снимает `ON DELETE CASCADE` в пределах
 * того же оператора, поэтому собственная транзакция не нужна. Файловых
 * операций здесь больше нет вообще, а с ними ушёл и порядок «сначала БД,
 * потом диск» из ADR-0012.
 */
export function deleteApplication(
  applicationId: ApplicationId,
): Promise<void> {
  return guarded('Не удалось удалить заявку', async () => {
    const db = await getDb();
    await db.execute(DELETE_APPLICATION, [applicationId]);
  });
}

/**
 * Переименовывает заявку.
 *
 * Название приходит `NonEmptyText`, поэтому проверять его здесь не на
 * что: тип гарантирует непустую строку без пробелов по краям.
 * Одноимённые заявки не запрещены — см. `createApplication`.
 */
export function renameApplication(
  applicationId: ApplicationId,
  title: NonEmptyText,
): Promise<void> {
  return guarded('Не удалось переименовать заявку', async () => {
    const db = await getDb();
    await db.execute(RENAME_APPLICATION, [
      title,
      new Date().toISOString(),
      applicationId,
    ]);
  });
}
