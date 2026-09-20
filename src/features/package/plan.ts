/**
 * План сборки пакета: что войдёт, что нет и сколько это займёт.
 *
 * Считается до начала работы. Пакет собирается и при неполном
 * чек-листе — решать, готов он или нет, человеку, а не приложению;
 * приложение обязано лишь честно показать «прикреплено N из M».
 *
 * Чистый модуль: ни базы, ни файлов, ни pdf-lib — поэтому проверяется
 * тестами без нативной части.
 */

import type { PackageDocument, PackageEntry } from '../checklist/model';
import type { PackagePlan, PlannedDocument, PlannedEntry } from './types';

/** Что умеет встроить сборка. Остальное идёт в реестр как «не включено». */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
const PDF_MIME_TYPE = 'application/pdf';

/**
 * Во сколько раз уменьшится фотография после сжатия.
 *
 * Снимок с телефона (3-5 МБ, 4000px по длинной стороне) после
 * уменьшения до 2000px и JPEG 85 занимает около трети исходного. Доля
 * взята с запасом в большую сторону: недооценка размера приведёт к
 * «место кончилось на середине», а это худший исход.
 */
const IMAGE_COMPRESSION_RATIO = 0.6;

/** Титульная страница-реестр: несколько килобайт текста и шрифт. */
const REGISTRY_PAGE_BYTES = 512 * 1024;

/**
 * Запас поверх суммы вложений.
 *
 * PDF добавляет к содержимому служебные структуры, а сжатие может
 * сработать хуже ожидаемого — например, если «фотография» на самом деле
 * скриншот, который JPEG сжимает плохо.
 */
const SIZE_RESERVE_RATIO = 0.2;

/** Размер, если его нет в базе (записи Фазы 1 до колонки `size_bytes`). */
const UNKNOWN_DOCUMENT_BYTES = 2 * 1024 * 1024;

function kindOf(document: PackageDocument): PlannedDocument['kind'] {
  const mimeType = document.mimeType;

  if (mimeType === null) {
    return 'unsupported';
  }
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return 'image';
  }
  return mimeType === PDF_MIME_TYPE ? 'pdf' : 'unsupported';
}

function estimateDocumentBytes(planned: PlannedDocument): number {
  if (planned.kind === 'unsupported') {
    return 0;
  }

  const size = planned.document.sizeBytes ?? UNKNOWN_DOCUMENT_BYTES;

  // PDF вклеивается страницами как есть — его размер не меняется.
  return planned.kind === 'image' ? size * IMAGE_COMPRESSION_RATIO : size;
}

/**
 * Строит план по пунктам чек-листа.
 *
 * Порядок пунктов сохраняется: он же будет порядком страниц и строк
 * реестра.
 */
export function planPackage(entries: readonly PackageEntry[]): PackagePlan {
  const planned: PlannedEntry[] = entries.map((entry, index) => {
    const itemNumber = index + 1;

    return {
      itemId: entry.itemId,
      itemNumber,
      itemLabel: entry.label,
      documents: entry.documents.map(document => ({
        document,
        itemNumber,
        itemLabel: entry.label,
        kind: kindOf(document),
      })),
    };
  });

  const documents = planned.flatMap(entry => entry.documents);
  const included = documents.filter(item => item.kind !== 'unsupported');

  const contentBytes = documents.reduce(
    (sum, item) => sum + estimateDocumentBytes(item),
    0,
  );

  return {
    entries: planned,
    attachedItemCount: planned.filter(entry => entry.documents.length > 0)
      .length,
    itemCount: planned.length,
    includedDocumentCount: included.length,
    unsupportedDocumentCount: documents.length - included.length,
    estimatedBytes: Math.ceil(
      contentBytes * (1 + SIZE_RESERVE_RATIO) + REGISTRY_PAGE_BYTES,
    ),
  };
}

/** Документы в том порядке, в каком их будет обрабатывать сборка. */
export function documentsToProcess(
  plan: PackagePlan,
): readonly PlannedDocument[] {
  return plan.entries.flatMap(entry => entry.documents);
}
