import type {
  ChecklistItemId,
  DocumentId,
  PackageDocument,
} from '../checklist/model';

/**
 * Что стало с документом в пакете.
 *
 * - `included` — страницы документа в пакете;
 * - `not-included` — формат, который в PDF не встроить (записи, сделанные
 *   до ограничения типов пикера: docx, heic и прочее). Пакет из-за них
 *   не срывается, но в реестре это видно;
 * - `no-file` — к пункту ничего не прикреплено.
 */
export type RegistryStatus = 'included' | 'not-included' | 'no-file';

/** Замечание к качеству снимка — из детектора, не из мнения человека. */
export type QualityFlag = 'blurry' | 'dark';

/** Строка реестра — по строке на документ, плюс строки пустых пунктов. */
export type RegistryRow = {
  /** Номер пункта чек-листа, с единицы. */
  readonly itemNumber: number;
  readonly itemLabel: string;
  /** Имя файла или `null` для пункта без документа. */
  readonly fileName: string | null;
  readonly status: RegistryStatus;
  /** Сколько страниц документ добавил в пакет. */
  readonly pageCount: number;
  /** Замечание детектора качества; `null`, если замечаний нет. */
  readonly quality: QualityFlag | null;
};

/** Документ, который сборка будет обрабатывать, с решением по нему. */
export type PlannedDocument = {
  readonly document: PackageDocument;
  readonly itemNumber: number;
  readonly itemLabel: string;
  /** `image` и `pdf` встраиваются, `unsupported` — только в реестр. */
  readonly kind: 'image' | 'pdf' | 'unsupported';
};

/** Пункт чек-листа в плане сборки. */
export type PlannedEntry = {
  readonly itemId: ChecklistItemId;
  readonly itemNumber: number;
  readonly itemLabel: string;
  readonly documents: readonly PlannedDocument[];
};

/**
 * План сборки: что будет в пакете и сколько это займёт.
 *
 * Считается до начала работы — чтобы показать «прикреплено N из M» и
 * проверить место на устройстве, не начав сборку в надежде на удачу.
 */
export type PackagePlan = {
  readonly entries: readonly PlannedEntry[];
  /** Пунктов, к которым прикреплён хотя бы один файл. */
  readonly attachedItemCount: number;
  /** Всего пунктов чек-листа. */
  readonly itemCount: number;
  /** Документов, которые будут встроены. */
  readonly includedDocumentCount: number;
  /** Документов, которые встроить нельзя. */
  readonly unsupportedDocumentCount: number;
  /** Ожидаемый размер готового файла в байтах, с запасом. */
  readonly estimatedBytes: number;
};

/** Готовый пакет. */
export type PackageBuildResult = {
  /** Абсолютный путь в кэше — файл незашифрован, см. `storage/exportFile`. */
  readonly filePath: string;
  readonly fileName: string;
  /** Всего страниц в пакете, включая реестр. */
  readonly pageCount: number;
  /** Сколько страниц занял реестр — остальное документы. */
  readonly registryPageCount: number;
  readonly registry: readonly RegistryRow[];
};

/** Ход сборки — для индикатора на экране. */
export type PackageProgress = {
  /** Сколько документов обработано. */
  readonly processed: number;
  /** Сколько всего документов предстоит обработать. */
  readonly total: number;
};

export type QualityByDocument = ReadonlyMap<DocumentId, QualityFlag>;
