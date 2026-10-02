/**
 * Титульная страница-реестр.
 *
 * Рисование проверяется через поддельный документ pdf-lib: важно не то,
 * какими координатами легли строки, а что в реестре есть каждый пункт,
 * в порядке чек-листа, с честным статусом и пометкой о качестве.
 */

import type { PDFDocument, PDFFont } from '@cantoo/pdf-lib';

import { drawRegistry } from '../registryPage';
import type { RegistryRow } from '../types';

type DrawnPage = { readonly texts: string[] };

/**
 * Поддельный документ: собирает вставленные страницы и нарисованный на
 * них текст. `insertPage` проверяется отдельно — реестр обязан
 * оказаться перед документами.
 */
function fakePdf() {
  const pages: DrawnPage[] = [];
  const insertedAt: number[] = [];

  const pdf = {
    insertPage(index: number) {
      insertedAt.push(index);
      const page: DrawnPage = { texts: [] };
      pages.push(page);
      return {
        drawText(text: string) {
          page.texts.push(text);
        },
      };
    },
  };

  return { pdf: pdf as unknown as PDFDocument, pages, insertedAt };
}

/** Ширина символа фиксированная: перенос строк должен быть предсказуем. */
const font = {
  widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.5,
} as unknown as PDFFont;

const FONTS = { regular: font, semibold: font };

const HEADER = {
  applicationTitle: 'ВНЖ Сербия',
  attachedItemCount: 2,
  itemCount: 3,
  createdAt: '21.09.2026',
};

function row(overrides: Partial<RegistryRow>): RegistryRow {
  return {
    itemNumber: 1,
    itemLabel: 'Паспорт',
    fileName: 'Паспорт.pdf',
    status: 'included',
    pageCount: 1,
    quality: null,
    ...overrides,
  };
}

function textOf(pages: readonly DrawnPage[]): string {
  return pages.flatMap(page => page.texts).join('\n');
}

it('шапка называет заявку и полноту чек-листа', () => {
  const { pdf, pages } = fakePdf();

  drawRegistry(pdf, FONTS, HEADER, [row({})]);

  const text = textOf(pages);
  expect(text).toContain('ВНЖ Сербия');
  expect(text).toContain('Собран 21.09.2026');
  expect(text).toContain('Прикреплено 2 из 3 пунктов');
  // Обещания «всё готово» в реестре быть не должно.
  expect(text).not.toContain('всё готово');
});

it('строки идут в порядке чек-листа', () => {
  const { pdf, pages } = fakePdf();

  drawRegistry(pdf, FONTS, HEADER, [
    row({ itemNumber: 1, itemLabel: 'Паспорт' }),
    row({ itemNumber: 2, itemLabel: 'Фото' }),
    row({ itemNumber: 3, itemLabel: 'Справка' }),
  ]);

  const text = textOf(pages);
  expect(text.indexOf('1. Паспорт')).toBeLessThan(text.indexOf('2. Фото'));
  expect(text.indexOf('2. Фото')).toBeLessThan(text.indexOf('3. Справка'));
});

it('статусы названы своими словами', () => {
  const { pdf, pages } = fakePdf();

  drawRegistry(pdf, FONTS, HEADER, [
    row({ itemNumber: 1, status: 'included', pageCount: 3 }),
    row({
      itemNumber: 2,
      status: 'not-included',
      fileName: 'Резюме.docx',
      pageCount: 0,
    }),
    row({ itemNumber: 3, status: 'no-file', fileName: null, pageCount: 0 }),
  ]);

  const text = textOf(pages);
  expect(text).toContain('включено, страниц: 3');
  expect(text).toContain(
    'Резюме.docx — не включено — формат не поддерживается',
  );
  expect(text).toContain('— файл не прикреплён');
});

it('пометка о качестве стоит рядом с пунктом', () => {
  const { pdf, pages } = fakePdf();

  drawRegistry(pdf, FONTS, HEADER, [
    row({ quality: 'blurry' }),
    row({ itemNumber: 2, itemLabel: 'Фото', quality: 'dark' }),
  ]);

  const text = textOf(pages);
  expect(text).toContain('размыт');
  expect(text).toContain('тёмный');
});

it('реестр вставляется в начало документа, страница за страницей', () => {
  const { pdf, pages, insertedAt } = fakePdf();

  const many = Array.from({ length: 60 }, (_, index) =>
    row({ itemNumber: index + 1, itemLabel: `Пункт ${index + 1}` }),
  );
  const pageCount = drawRegistry(pdf, FONTS, HEADER, many);

  // Длинный реестр не влезает на одну страницу.
  expect(pageCount).toBeGreaterThan(1);
  expect(pages).toHaveLength(pageCount);
  // 0, 1, 2… — страницы документов сдвигаются назад, порядок реестра
  // сохраняется.
  expect(insertedAt).toEqual(
    Array.from({ length: pageCount }, (_, index) => index),
  );
});

it('длинное название пункта переносится, а не обрезается', () => {
  const { pdf, pages } = fakePdf();
  const label =
    'Справка о несудимости с апостилем и нотариальным переводом на сербский язык';

  drawRegistry(pdf, FONTS, HEADER, [row({ itemLabel: label })]);

  const text = textOf(pages);
  for (const word of label.split(' ')) {
    expect(text).toContain(word);
  }
});
