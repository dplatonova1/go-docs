/**
 * Сборка финального PDF-пакета.
 *
 * Порядок работы:
 *
 * 1. уборка прошлых сборок и проверка места по оценке из `plan.ts` —
 *    «не хватило места» должно случаться до сборки, а не на её середине;
 * 2. документы обрабатываются **по одному, в порядке чек-листа**:
 *    расшифровать → (для снимка) сжать → встроить страницы → отпустить
 *    ссылки на промежуточные буферы. Массива распакованных картинок
 *    здесь нет ни в каком виде;
 * 3. титульная страница-реестр вставляется в начало — когда уже
 *    известно, сколько страниц дал каждый документ;
 * 4. результат пишется во временный файл и переименовывается в целевой
 *    только после успешного `save()`.
 *
 * **Про память.** Даже при обработке по одному расход растёт по ходу
 * сборки: `pdf-lib` держит уже встроенные страницы в памяти до вызова
 * `save()` — иначе сформировать PDF нельзя. Это ожидаемо и
 * пропорционально размеру *итогового* файла (сжатым копиям), а не сумме
 * исходных фотографий. Пакет из 25 снимков по 4 МБ даёт не 100 МБ в
 * памяти, а порядка размера готового PDF. Считать это утечкой и искать
 * её в этом модуле не нужно; если однажды упрёмся — решение не в
 * микрооптимизациях здесь, а в потоковой записи, которой у `pdf-lib`
 * нет.
 *
 * Сбой на одном документе не срывает пакет: документ помечается в
 * реестре как невключённый, и сборка продолжается. Пакет без одной
 * страницы полезнее, чем отсутствие пакета.
 */

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from '@cantoo/pdf-lib';

import { assertEnoughSpace, readFile, toRelativePath } from '../../storage/fs';
import {
  clearExportDirectory,
  finalizeExport,
  toExportFileName,
  writeTemporaryExport,
} from '../../storage/exportFile';
import type { Application } from '../checklist/model';
import { documentsToProcess } from './plan';
import { processImage } from './processImage';
import { loadRegistryFonts } from './registryFonts';
import { A4, drawRegistry } from './registryPage';
import type {
  PackageBuildResult,
  PackagePlan,
  PackageProgress,
  PlannedDocument,
  RegistryRow,
} from './types';

/** Поля вокруг снимка на странице A4. */
const IMAGE_MARGIN = 24;

/** Дата в реестре: без времени — пакет печатают, а не версионируют. */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

function rowFor(
  planned: PlannedDocument,
  status: RegistryRow['status'],
  pageCount: number,
  quality: RegistryRow['quality'],
): RegistryRow {
  return {
    itemNumber: planned.itemNumber,
    itemLabel: planned.itemLabel,
    fileName: planned.document.name,
    status,
    pageCount,
    quality,
  };
}

/**
 * Встраивает снимок одной страницей A4, вписывая его в поля и сохраняя
 * пропорции. Страница A4, а не по размеру картинки: пакет печатают.
 */
async function addImagePage(
  pdf: PDFDocument,
  planned: PlannedDocument,
  bytes: Uint8Array,
): Promise<RegistryRow> {
  const processed = await processImage(bytes, planned.document.mimeType);
  const embedded = await pdf.embedJpg(processed.bytes);

  const maxWidth = A4.width - IMAGE_MARGIN * 2;
  const maxHeight = A4.height - IMAGE_MARGIN * 2;
  const scale = Math.min(
    maxWidth / processed.width,
    maxHeight / processed.height,
    1,
  );
  const width = processed.width * scale;
  const height = processed.height * scale;

  const page = pdf.addPage([A4.width, A4.height]);
  page.drawImage(embedded, {
    x: (A4.width - width) / 2,
    y: (A4.height - height) / 2,
    width,
    height,
  });

  return rowFor(planned, 'included', 1, processed.quality);
}

/** Вклеивает страницы PDF как есть: пережимать их нечем и незачем. */
async function addPdfPages(
  pdf: PDFDocument,
  planned: PlannedDocument,
  bytes: Uint8Array,
): Promise<RegistryRow> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const copied = await pdf.copyPages(source, source.getPageIndices());

  for (const page of copied) {
    pdf.addPage(page);
  }

  return rowFor(planned, 'included', copied.length, null);
}

async function addDocument(
  pdf: PDFDocument,
  planned: PlannedDocument,
): Promise<RegistryRow> {
  if (planned.kind === 'unsupported') {
    // Файл даже не читается: встроить его всё равно нечем.
    return rowFor(planned, 'not-included', 0, null);
  }

  try {
    // Ссылка на байты живёт только внутри этого вызова: дальше её
    // подхватит сборщик мусора, пока обрабатывается следующий документ.
    const bytes = await readFile(toRelativePath(planned.document.filePath));

    return planned.kind === 'image'
      ? await addImagePage(pdf, planned, bytes)
      : await addPdfPages(pdf, planned, bytes);
  } catch {
    // Файл пропал, не расшифровался или оказался битым PDF. Для пакета
    // это то же самое, что неподдерживаемый формат: строка в реестре
    // есть, страницы нет.
    return rowFor(planned, 'not-included', 0, null);
  }
}

export async function buildPackage(
  application: Application,
  plan: PackagePlan,
  onProgress: (progress: PackageProgress) => void,
): Promise<PackageBuildResult> {
  // Незашифрованные пакеты прошлых сборок не должны лежать в кэше,
  // пока собирается новый.
  await clearExportDirectory();
  await assertEnoughSpace(plan.estimatedBytes);

  const fontBytes = await loadRegistryFonts();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const fonts = {
    regular: await pdf.embedFont(fontBytes.regular, { subset: true }),
    semibold: await pdf.embedFont(fontBytes.semibold, { subset: true }),
  };

  const planned = documentsToProcess(plan);
  const rows: RegistryRow[] = [];
  let processed = 0;

  for (const entry of plan.entries) {
    if (entry.documents.length === 0) {
      rows.push({
        itemNumber: entry.itemNumber,
        itemLabel: entry.itemLabel,
        fileName: null,
        status: 'no-file',
        pageCount: 0,
        quality: null,
      });
      continue;
    }

    for (const document of entry.documents) {
      rows.push(await addDocument(pdf, document));
      processed += 1;
      onProgress({ processed, total: planned.length });
    }
  }

  const registryPageCount = drawRegistry(
    pdf,
    fonts,
    {
      applicationTitle: application.title,
      attachedItemCount: plan.attachedItemCount,
      itemCount: plan.itemCount,
      createdAt: formatDate(new Date()),
    },
    rows,
  );

  const bytes = await pdf.save();
  const temporaryPath = await writeTemporaryExport(bytes);
  const fileName = toExportFileName(application.title);
  const filePath = await finalizeExport(temporaryPath, fileName);

  return {
    filePath,
    fileName,
    pageCount: pdf.getPageCount(),
    registryPageCount,
    registry: rows,
  };
}
