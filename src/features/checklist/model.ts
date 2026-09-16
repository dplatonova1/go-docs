/**
 * Модель предметной области чек-листа.
 *
 * Идентификаторы брендированы: `ApplicationId` и `ChecklistItemId` в
 * рантайме — одинаковые строки, и без бренда перепутать их в аргументах
 * запроса tsc бы не помешал.
 */

export type ApplicationId = string & { readonly __brand: 'ApplicationId' };
export type ChecklistItemId = string & { readonly __brand: 'ChecklistItemId' };
export type DocumentId = string & { readonly __brand: 'DocumentId' };

/**
 * Предел размера прикрепляемого файла.
 *
 * Файл шифруется целиком в памяти (base64 → байты → шифротекст → base64),
 * и пик потребления в несколько раз больше самого файла. 5 МБ — с запасом
 * для бюджетного Android и достаточно для скана страницы или сжатого PDF.
 * Фото с камеры современного телефона бывает больше: пользователь увидит
 * сообщение с советом уменьшить файл. Поднимать предел выше 20 МБ — только
 * вместе с потоковым шифрованием.
 */
export const MAX_ATTACHMENT_MEGABYTES = 5;
export const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MEGABYTES * 1024 * 1024;

/**
 * Строка без пробелов по краям и не пустая.
 *
 * Создаётся только через `toNonEmptyText`, поэтому функция, принимающая
 * такой тип, не может получить непроверенный ввод — проверка на пустоту
 * не размазывается по репозиторию и экранам.
 */
export type NonEmptyText = string & { readonly __brand: 'NonEmptyText' };

export function toNonEmptyText(value: string): NonEmptyText | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? (trimmed as NonEmptyText) : null;
}

/** Значения совпадают с CHECK-ограничением `checklist_items.status`. */
export const CHECKLIST_ITEM_STATUSES = ['pending', 'attached', 'done'] as const;

export type ChecklistItemStatus = (typeof CHECKLIST_ITEM_STATUSES)[number];

export function isChecklistItemStatus(
  value: unknown,
): value is ChecklistItemStatus {
  return (CHECKLIST_ITEM_STATUSES as readonly unknown[]).includes(value);
}

export type Application = {
  readonly id: ApplicationId;
  readonly title: string;
};

/** Документ, прикреплённый к пункту, — то, что нужно для показа в списке. */
export type AttachedDocument = {
  readonly id: DocumentId;
  /** Имя файла в источнике. `null`, если источник его не сообщил. */
  readonly name: string | null;
};

export type ChecklistItem = {
  readonly id: ChecklistItemId;
  readonly label: string;
  /** Порядок внутри заявки, с нуля. */
  readonly position: number;
  readonly status: ChecklistItemStatus;
  /** Прикреплённые документы в порядке прикрепления. */
  readonly documents: readonly AttachedDocument[];
};

/**
 * Прикреплено ли что-то к пункту.
 *
 * По связям, а не по колонке `status`: связь — источник правды о том,
 * есть ли у пункта файл, а `status` в Фазе 2 получит «готово», которое от
 * наличия файла не зависит.
 */
export function isAttached(item: ChecklistItem): boolean {
  return item.documents.length > 0;
}

/**
 * Список пунктов после успешного прикрепления — без перечитывания базы.
 * Остальные пункты сохраняют ссылку, и их строки не перерисовываются.
 */
export function withAttachedDocument(
  items: readonly ChecklistItem[],
  itemId: ChecklistItemId,
  document: AttachedDocument,
): readonly ChecklistItem[] {
  return items.map(
    (item): ChecklistItem =>
      item.id === itemId
        ? {
            ...item,
            status: item.status === 'pending' ? 'attached' : item.status,
            documents: [...item.documents, document],
          }
        : item,
  );
}

/**
 * Список пунктов после удаления файла — без перечитывания базы.
 *
 * Пункт, оставшийся без файлов, снова становится неотмеченным. Статус
 * «готово» (Фаза 2) при этом не трогается: он про решение пользователя, а
 * не про наличие файла.
 */
export function withoutDocument(
  items: readonly ChecklistItem[],
  itemId: ChecklistItemId,
  documentId: DocumentId,
): readonly ChecklistItem[] {
  return items.map((item): ChecklistItem => {
    if (item.id !== itemId) {
      return item;
    }

    const documents = item.documents.filter(
      document => document.id !== documentId,
    );
    if (documents.length === item.documents.length) {
      return item;
    }

    return {
      ...item,
      documents,
      status:
        documents.length === 0 && item.status === 'attached'
          ? 'pending'
          : item.status,
    };
  });
}

/** Всё, что записывается в БД при прикреплении файла к пункту. */
export type NewDocumentAttachment = {
  readonly id: DocumentId;
  readonly itemId: ChecklistItemId;
  /** Относительный путь зашифрованного файла в песочнице. */
  readonly filePath: string;
  readonly originalFilename: string | null;
  readonly mimeType: string | null;
  /** Размер исходного (незашифрованного) файла. */
  readonly sizeBytes: number;
};

/** `keyExtractor` для списков пунктов: стабильный id из БД, не индекс. */
export function checklistItemKeyOf(item: ChecklistItem): string {
  return item.id;
}

/**
 * Что удалит сброс заявки — числа для диалога подтверждения
 * ([ADR-0012](../../../docs/adr/0012-delete-orphan-documents-with-application.md)).
 */
export type ResetImpact = {
  readonly itemCount: number;
  /** Документы, прикреплённые только к этой заявке, — удалятся вместе с ней. */
  readonly deletedDocumentCount: number;
  /** Документы, прикреплённые ещё и к другим заявкам, — останутся. */
  readonly keptDocumentCount: number;
};

/**
 * Заявка, подтверждённая пользователем и готовая к записи.
 *
 * Хотя бы один пункт — свойство типа, а не проверка в репозитории: заявка
 * без пунктов в Фазе 1 бесполезна, а экрана, где их можно добавить
 * потом, нет.
 */
export type NewApplication = {
  readonly title: NonEmptyText;
  readonly itemLabels: readonly [NonEmptyText, ...NonEmptyText[]];
};
