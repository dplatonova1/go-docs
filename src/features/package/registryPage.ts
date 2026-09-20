/**
 * Титульная страница-реестр: что вошло в пакет и в каком порядке.
 *
 * Реестр — не украшение: по нему в ведомстве сверяют состав папки, а
 * пользователь видит, что именно ушло в печать и чего не хватает.
 * Поэтому в нём есть и пункты без файлов, и документы, которые
 * встроить не удалось.
 *
 * Строки идут в порядке чек-листа — том же, в каком идут страницы.
 */

import type { PDFDocument, PDFFont, PDFPage } from '@cantoo/pdf-lib';
import { rgb } from '@cantoo/pdf-lib';

import type { RegistryRow } from './types';

/** A4 в пунктах PDF (72 dpi): 210×297 мм. */
export const A4 = { width: 595.28, height: 841.89 } as const;

const MARGIN = 48;
const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 11;
const ROW_SIZE = 11;
const NOTE_SIZE = 9;
const LINE_HEIGHT = 15;
const ROW_GAP = 6;

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.42, 0.46);
const WARNING = rgb(0.62, 0.32, 0.05);

const STATUS_TEXT = {
  included: 'включено',
  'not-included': 'не включено — формат не поддерживается',
  'no-file': 'файл не прикреплён',
} as const;

const QUALITY_TEXT = {
  blurry: 'возможно, снимок размыт — проверьте перед печатью',
  dark: 'возможно, снимок тёмный — проверьте перед печатью',
} as const;

/**
 * Перенос по словам под заданную ширину.
 *
 * Слово длиннее строки (например, имя файла без пробелов) не
 * переносится по буквам, а выходит за край: обрезать имя файла в
 * реестре хуже, чем оставить некрасивую строку.
 */
function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): readonly string[] {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      lines.push(current);
    }
    current = word;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}

type Cursor = {
  page: PDFPage;
  y: number;
};

export type RegistryHeader = {
  readonly applicationTitle: string;
  readonly attachedItemCount: number;
  readonly itemCount: number;
  readonly createdAt: string;
};

/**
 * Рисует реестр и возвращает число занятых им страниц.
 *
 * Страницы создаются через `insertPage`, начиная с нулевой: реестр
 * должен оказаться перед документами, а они к этому моменту уже в
 * пакете — иначе неоткуда взять число страниц у каждого документа.
 */
export function drawRegistry(
  pdf: PDFDocument,
  fonts: { readonly regular: PDFFont; readonly semibold: PDFFont },
  header: RegistryHeader,
  rows: readonly RegistryRow[],
): number {
  const contentWidth = A4.width - MARGIN * 2;
  let pageCount = 0;

  const newPage = (): Cursor => {
    const page = pdf.insertPage(pageCount, [A4.width, A4.height]);
    pageCount += 1;
    return { page, y: A4.height - MARGIN };
  };

  const cursor = newPage();

  const ensureSpace = (needed: number): void => {
    if (cursor.y - needed < MARGIN) {
      const next = newPage();
      cursor.page = next.page;
      cursor.y = next.y;
    }
  };

  const write = (
    text: string,
    font: PDFFont,
    size: number,
    color: ReturnType<typeof rgb>,
    indent = 0,
  ): void => {
    for (const line of wrap(text, font, size, contentWidth - indent)) {
      ensureSpace(LINE_HEIGHT);
      cursor.page.drawText(line, {
        x: MARGIN + indent,
        y: cursor.y - size,
        size,
        font,
        color,
      });
      cursor.y -= LINE_HEIGHT;
    }
  };

  write(
    `Пакет документов: ${header.applicationTitle}`,
    fonts.semibold,
    TITLE_SIZE,
    INK,
  );
  cursor.y -= 4;
  write(
    `Собран ${header.createdAt}. Прикреплено ${header.attachedItemCount} из ${header.itemCount} пунктов чек-листа.`,
    fonts.regular,
    SUBTITLE_SIZE,
    MUTED,
  );
  cursor.y -= 10;

  for (const row of rows) {
    ensureSpace(LINE_HEIGHT * 2);

    write(`${row.itemNumber}. ${row.itemLabel}`, fonts.semibold, ROW_SIZE, INK);

    const fileName = row.fileName ?? '—';
    const pages =
      row.status === 'included' ? `, страниц: ${row.pageCount}` : '';
    write(
      `${fileName} — ${STATUS_TEXT[row.status]}${pages}`,
      fonts.regular,
      ROW_SIZE,
      row.status === 'included' ? MUTED : WARNING,
      14,
    );

    if (row.quality !== null) {
      write(QUALITY_TEXT[row.quality], fonts.regular, NOTE_SIZE, WARNING, 14);
    }

    cursor.y -= ROW_GAP;
  }

  return pageCount;
}
