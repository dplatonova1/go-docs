/**
 * Сборка пакета на фикстурах, с настоящими pdf-lib и fontkit.
 *
 * Соседний `buildPackage.test.ts` мокает pdf-lib целиком и проверяет
 * сценарий. Здесь наоборот: библиотеки настоящие, и проверяется
 * результат — что получился читаемый PDF, в нём столько страниц,
 * сколько обещано, и в том порядке, в каком идёт чек-лист.
 *
 * Мокаются только границы, которых в Node нет:
 * - `storage/fs` — вместо расшифровки отдаёт байты фикстуры;
 * - `storage/exportFile` — перехватывает итоговые байты;
 * - `processImage` — обработка снимка идёт через нативный
 *   `react-native-nitro-image`; вместо неё отдаётся готовый JPEG.
 *
 * Шрифт при этом настоящий: `registryFonts` читает тот же Onest из
 * `android/app/src/main/assets`, что и приложение. Кириллица в реестре
 * — главная причина, по которой сюда вообще потребовался fontkit.
 */

import { PDFDocument } from '@cantoo/pdf-lib';

import { ensureTextDecoder } from '../../../polyfills/textDecoder';
import { base64ToBytes } from '../../../storage/base64';
import type {
  ApplicationId,
  ChecklistItemId,
  DocumentId,
} from '../../checklist/model';
import { buildPackage } from '../buildPackage';
import { planPackage } from '../plan';

jest.mock('../../../storage/fs', () => ({
  readFile: jest.fn(),
  assertEnoughSpace: jest.fn().mockResolvedValue(undefined),
  toRelativePath: (value: string) => value,
}));

jest.mock('../../../storage/exportFile', () => ({
  clearExportDirectory: jest.fn().mockResolvedValue(undefined),
  writeTemporaryExport: jest.fn(),
  finalizeExport: jest.fn(),
  toExportFileName: (title: string) => `Пакет — ${title}.pdf`,
}));

jest.mock('../processImage', () => ({ processImage: jest.fn() }));

jest.mock('../registryFonts', () => ({ loadRegistryFonts: jest.fn() }));

const fs = require('../../../storage/fs');
const exportFile = require('../../../storage/exportFile');
const { processImage } = require('../processImage');
const { loadRegistryFonts } = require('../registryFonts');

// `require`, а не `import`: типов Node в проекте нет (это React Native),
// а шрифт для реестра нужен настоящий — тот же, что в приложении.
const { readFileSync } = require('node:fs');

/** Путь от корня проекта: jest запускается именно оттуда. */
const FONTS_DIR = 'android/app/src/main/assets/fonts';

/** JPEG 1×1: pdf-lib разбирает его как настоящую картинку. */
const JPEG_1X1 = base64ToBytes(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
    'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB' +
    '/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9' +
    'AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3' +
    'ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKj' +
    'pKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6' +
    '/9oADAMBAAIRAxEAPwD3+iiigD//2Q==',
);

const APPLICATION = {
  id: 'app-1' as ApplicationId,
  title: 'ВНЖ Сербия',
};

/** Страницы вложенного PDF заметно не A4 — по ним видно порядок. */
const FIXTURE_PDF_SIZE = { width: 300, height: 200 } as const;

function document(
  id: string,
  name: string,
  mimeType: string | null,
): {
  id: DocumentId;
  name: string;
  mimeType: string | null;
  sizeBytes: number;
  filePath: string;
} {
  return {
    id: id as DocumentId,
    name,
    mimeType,
    sizeBytes: 1024,
    filePath: `documents/${id}`,
  };
}

function entry(
  id: string,
  label: string,
  position: number,
  documents: ReturnType<typeof document>[],
) {
  return {
    itemId: id as ChecklistItemId,
    label,
    position,
    documents,
  };
}

/** Двухстраничный PDF — вложение, которое должно вклеиться как есть. */
async function makeFixturePdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([FIXTURE_PDF_SIZE.width, FIXTURE_PDF_SIZE.height]);
  pdf.addPage([FIXTURE_PDF_SIZE.width, FIXTURE_PDF_SIZE.height]);
  return pdf.save();
}

let fixturePdf: Uint8Array;
let savedBytes: Uint8Array | undefined;

beforeAll(async () => {
  // В Node TextDecoder есть, но пусть порядок совпадает с приложением.
  ensureTextDecoder();
  fixturePdf = await makeFixturePdf();
});

beforeEach(() => {
  jest.clearAllMocks();
  savedBytes = undefined;

  loadRegistryFonts.mockResolvedValue({
    regular: new Uint8Array(readFileSync(`${FONTS_DIR}/Onest-Regular.ttf`)),
    semibold: new Uint8Array(readFileSync(`${FONTS_DIR}/Onest-SemiBold.ttf`)),
  });

  fs.readFile.mockImplementation(async (path: string) =>
    path === 'documents/pdf-1' ? fixturePdf : JPEG_1X1,
  );
  fs.assertEnoughSpace.mockResolvedValue(undefined);

  processImage.mockResolvedValue({
    bytes: JPEG_1X1,
    width: 1200,
    height: 1600,
    quality: null,
  });

  exportFile.clearExportDirectory.mockResolvedValue(undefined);
  exportFile.writeTemporaryExport.mockImplementation(
    async (bytes: Uint8Array) => {
      savedBytes = bytes;
      return '/cache/packages/package.tmp';
    },
  );
  exportFile.finalizeExport.mockResolvedValue(
    '/cache/packages/Пакет — ВНЖ Сербия.pdf',
  );
});

/** Набор из промпта: снимок, PDF, легаси-запись и пункт без файла. */
function fixturePlan() {
  return planPackage([
    entry('i1', 'Фото 3×4', 0, [document('img-1', 'Фото.jpg', 'image/jpeg')]),
    entry('i2', 'Паспорт', 1, [
      document('pdf-1', 'Паспорт.pdf', 'application/pdf'),
    ]),
    entry('i3', 'Резюме', 2, [
      document(
        'doc-1',
        'Резюме.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ]),
    entry('i4', 'Справка', 3, []),
  ]);
}

it('собирает читаемый PDF, а не набор байтов', async () => {
  const result = await buildPackage(APPLICATION, fixturePlan(), () => {});

  expect(savedBytes).toBeInstanceOf(Uint8Array);
  // Если бы pdf-lib сохранил мусор, загрузка бы упала.
  const reloaded = await PDFDocument.load(savedBytes as Uint8Array);
  expect(reloaded.getPageCount()).toBe(result.pageCount);
});

it('порядок страниц: сначала реестр, потом документы по чек-листу', async () => {
  const result = await buildPackage(APPLICATION, fixturePlan(), () => {});
  const reloaded = await PDFDocument.load(savedBytes as Uint8Array);

  const sizes = reloaded
    .getPages()
    .map(page => [Math.round(page.getWidth()), Math.round(page.getHeight())]);

  // Реестр + страница снимка — A4; дальше две страницы вложенного PDF
  // со своим размером, в порядке пунктов.
  expect(result.registryPageCount).toBeGreaterThanOrEqual(1);
  expect(sizes.slice(0, result.registryPageCount + 1)).toEqual(
    Array.from({ length: result.registryPageCount + 1 }, () => [595, 842]),
  );
  expect(sizes.slice(result.registryPageCount + 1)).toEqual([
    [FIXTURE_PDF_SIZE.width, FIXTURE_PDF_SIZE.height],
    [FIXTURE_PDF_SIZE.width, FIXTURE_PDF_SIZE.height],
  ]);
});

it('реестр перечисляет все пункты в порядке чек-листа', async () => {
  const result = await buildPackage(APPLICATION, fixturePlan(), () => {});

  expect(
    result.registry.map(row => [row.itemNumber, row.itemLabel, row.status]),
  ).toEqual([
    [1, 'Фото 3×4', 'included'],
    [2, 'Паспорт', 'included'],
    [3, 'Резюме', 'not-included'],
    [4, 'Справка', 'no-file'],
  ]);
});

it('реестр знает, сколько страниц дал каждый документ', async () => {
  const result = await buildPackage(APPLICATION, fixturePlan(), () => {});

  expect(result.registry.map(row => row.pageCount)).toEqual([1, 2, 0, 0]);
});

it('легаси-запись с недопустимым типом уходит в «не включено», а не в крах', async () => {
  const result = await buildPackage(APPLICATION, fixturePlan(), () => {});

  const legacy = result.registry[2];
  expect(legacy).toMatchObject({
    fileName: 'Резюме.docx',
    status: 'not-included',
    pageCount: 0,
  });
  // Файл даже не читался: встроить его всё равно нечем.
  expect(fs.readFile).not.toHaveBeenCalledWith('documents/doc-1');
  // И пакет при этом собран.
  expect(savedBytes).toBeInstanceOf(Uint8Array);
});

it('битый PDF не срывает сборку — остальные страницы на месте', async () => {
  fs.readFile.mockImplementation(async (path: string) =>
    path === 'documents/pdf-1'
      ? Uint8Array.from([1, 2, 3, 4]) // не PDF
      : JPEG_1X1,
  );

  const result = await buildPackage(APPLICATION, fixturePlan(), () => {});

  expect(result.registry[1]).toMatchObject({
    fileName: 'Паспорт.pdf',
    status: 'not-included',
  });
  expect(result.registry[0]).toMatchObject({ status: 'included' });
  const reloaded = await PDFDocument.load(savedBytes as Uint8Array);
  expect(reloaded.getPageCount()).toBe(result.registryPageCount + 1);
});

it('пометка о качестве доезжает из обработки снимка в реестр', async () => {
  processImage.mockResolvedValue({
    bytes: JPEG_1X1,
    width: 1200,
    height: 1600,
    quality: 'blurry',
  });

  const result = await buildPackage(APPLICATION, fixturePlan(), () => {});

  expect(result.registry[0]).toMatchObject({
    status: 'included',
    quality: 'blurry',
  });
});

it('кириллица в реестре не ломает сохранение', async () => {
  // Со стандартными шрифтами PDF этот вызов падал бы на первой же
  // русской букве — ради этого и встраивается Onest.
  const plan = planPackage([
    entry('i1', 'Справка о несудимости с апостилем', 0, [
      document('img-1', 'Скан.jpg', 'image/jpeg'),
    ]),
  ]);

  const result = await buildPackage(
    { ...APPLICATION, title: 'ВНЖ Сербия — семья' },
    plan,
    () => {},
  );

  expect(result.pageCount).toBeGreaterThan(1);
  await expect(
    PDFDocument.load(savedBytes as Uint8Array),
  ).resolves.toBeDefined();
});
