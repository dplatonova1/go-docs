/**
 * Модель предметной области чек-листа.
 *
 * Идентификаторы брендированы: `ApplicationId` и `ChecklistItemId` в
 * рантайме — одинаковые строки, и без бренда перепутать их в аргументах
 * запроса tsc бы не помешал.
 */

import type { QualityFlag } from '../package/types';

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
 * MIME-типы, которые можно прикрепить.
 *
 * Список задан форматом итогового пакета (Фаза 2): `@cantoo/pdf-lib`
 * встраивает JPEG и PNG, а страницы PDF переносит как есть. Всё
 * остальное пришлось бы конвертировать на устройстве — это отдельная
 * нативная зависимость ради формата, который пользователь почти всегда
 * может пересохранить сам.
 *
 * Отдельно про HEIC/HEIF: это формат снимков камеры iPhone по умолчанию,
 * и его здесь нет сознательно — pdf-lib его не встраивает. Ограничение
 * держится фильтром пикера: такой файл просто не выбрать, и логика
 * конвертации не нужна.
 *
 * Значения — MIME-типы, потому что в `documents.mime_type` хранится
 * именно MIME (на обеих платформах). Фильтр самого пикера на iOS
 * задаётся иначе, см. `pickDocument.ts`.
 */
export const ATTACHABLE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export type AttachableMimeType = (typeof ATTACHABLE_MIME_TYPES)[number];

/**
 * Годится ли тип для прикрепления.
 *
 * В базе есть документы, прикреплённые до ограничения типов, — у них
 * может быть любой MIME или `null`. Такие записи не трогаются, но в
 * итоговый пакет не попадут (Фаза 2).
 */
export function isAttachableMimeType(
  value: unknown,
): value is AttachableMimeType {
  return (ATTACHABLE_MIME_TYPES as readonly unknown[]).includes(value);
}

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
  readonly mimeType: string | null;
  /** Размер исходного файла. `null` у записей, созданных до Фазы 1. */
  readonly sizeBytes: number | null;
  /** Относительный путь зашифрованного файла — нужен для превью. */
  readonly filePath: string;
  /**
   * Пометка детектора качества при прикреплении (`documents.quality_flag`)
   * или `null` — замечаний нет, не снимок или ещё не проверялся.
   */
  readonly qualityFlag: QualityFlag | null;
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
  /** SHA-256 незашифрованного содержимого — ключ дедупликации. */
  readonly contentHash: string;
  /** Пометка детектора качества, посчитанная при прикреплении. */
  readonly qualityFlag: QualityFlag | null;
};

/**
 * Чем закончилась запись прикрепления.
 *
 * - `created` — документа с таким содержимым не было, записан новый;
 * - `reused` — такой файл уже загружен, создана только связь. Записанный
 *   до транзакции зашифрованный файл вызывающему нужно удалить: он
 *   дубликат;
 * - `already-attached` — этот документ уже прикреплён к этому пункту,
 *   в базе ничего не изменилось.
 */
export type DocumentAttachOutcome =
  | { readonly status: 'created'; readonly document: AttachedDocument }
  | { readonly status: 'reused'; readonly document: AttachedDocument }
  | {
      readonly status: 'already-attached';
      readonly document: AttachedDocument;
    };

/**
 * Документ так, как он нужен сборке пакета: с типом, размером и путём к
 * зашифрованному файлу.
 */
export type PackageDocument = {
  readonly id: DocumentId;
  readonly name: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly filePath: string;
};

/**
 * Пункт чек-листа со всеми его документами — в порядке чек-листа.
 *
 * Пункты без документов тоже здесь: в реестре пакета они должны быть
 * видны как «файл не прикреплён», иначе пакет молча окажется неполным.
 */
export type PackageEntry = {
  readonly itemId: ChecklistItemId;
  readonly label: string;
  readonly position: number;
  readonly documents: readonly PackageDocument[];
};

/**
 * Документ в библиотеке пользователя.
 *
 * Библиотека — это вся таблица `documents`, а не документы одной заявки
 * ([ADR-0010](../../../docs/adr/0010-shared-document-library.md)): один
 * скан паспорта закрывает пункты в разных заявках, и загружать его
 * повторно не нужно.
 */
export type LibraryDocument = {
  readonly id: DocumentId;
  /** Имя файла в источнике. `null`, если источник его не сообщил. */
  readonly name: string | null;
  readonly mimeType: string | null;
  /** Размер исходного файла. `null` у записей, созданных до Фазы 1. */
  readonly sizeBytes: number | null;
  /** ISO-время добавления в библиотеку. */
  readonly createdAt: string;
  /** Относительный путь зашифрованного файла — нужен для превью. */
  readonly filePath: string;
  /**
   * Пометка детектора качества при прикреплении (`documents.quality_flag`)
   * или `null` — замечаний нет, не снимок или ещё не проверялся.
   */
  readonly qualityFlag: QualityFlag | null;
  /**
   * Документ уже прикреплён к пункту, для которого открыт выбор.
   * Всегда `false`, когда библиотека открыта на просмотр.
   */
  readonly isAttachedToItem: boolean;
};

/**
 * Где документ используется сейчас — для подтверждения удаления из
 * библиотеки.
 *
 * Удаление документа каскадом снимает его со всех пунктов всех заявок
 * (`ON DELETE CASCADE` на `checklist_item_documents.document_id`), и
 * пользователь должен увидеть этот список до того, как согласится.
 */
export type DocumentUsageInApplication = {
  readonly applicationTitle: string;
  /** Сколько пунктов чек-листа этой заявки закрыты документом. */
  readonly itemCount: number;
};

export type DocumentUsage = {
  /** Всего пунктов во всех заявках. */
  readonly itemCount: number;
  /** По заявке на строку; пустой, если документ никуда не прикреплён. */
  readonly applications: readonly DocumentUsageInApplication[];
};

/** Итог прикрепления документа из библиотеки. */
export type LibraryAttachResult = 'attached' | 'already-attached';

/** `keyExtractor` для списка документов: стабильный id из БД, не индекс. */
export function libraryDocumentKeyOf(document: LibraryDocument): string {
  return document.id;
}

/** `keyExtractor` для списка заявок: стабильный id из БД, не индекс. */
export function applicationKeyOf(application: Application): string {
  return application.id;
}

/** `keyExtractor` для списков пунктов: стабильный id из БД, не индекс. */
export function checklistItemKeyOf(item: ChecklistItem): string {
  return item.id;
}

/**
 * Что произойдёт при удалении заявки — числа для диалога подтверждения
 * ([ADR-0016](../../../docs/adr/0016-application-deletion-keeps-documents.md)).
 *
 * Документы вместе с заявкой не удаляются: они принадлежат библиотеке
 * пользователя. Поэтому второе число — про то, что останется, а не про
 * то, что пропадёт.
 */
export type ApplicationDeletionImpact = {
  readonly itemCount: number;
  /** Документы, прикреплённые к пунктам этой заявки, — останутся. */
  readonly documentCount: number;
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
