/**
 * Сборка пакета целиком: порядок шагов и поведение при сбоях.
 *
 * pdf-lib, файловое хранилище и нативная обработка снимков замоканы на
 * границах — здесь проверяется сценарий, а не чужие библиотеки:
 *
 * - место проверяется до первого чтения файла;
 * - документы обрабатываются по одному, в порядке чек-листа;
 * - сбой на одном документе не срывает пакет;
 * - целевой файл появляется только после успешного `save()`.
 */

import type { ApplicationId, ChecklistItemId, DocumentId } from '../../checklist/model';
import { buildPackage } from '../buildPackage';
import { isPackageAssemblyError } from '../errors';
import { planPackage } from '../plan';

jest.mock('../../../storage/fs', () => ({
  readFile: jest.fn(),
  assertEnoughSpace: jest.fn(),
  toRelativePath: (value: string) => value,
}));

jest.mock('../../../storage/exportFile', () => ({
  clearExportDirectory: jest.fn(),
  writeTemporaryExport: jest.fn(),
  finalizeExport: jest.fn(),
  toExportFileName: (title: string) => `Пакет — ${title}.pdf`,
}));

jest.mock('../processImage', () => ({ processImage: jest.fn() }));

jest.mock('../registryFonts', () => ({
  loadRegistryFonts: jest.fn(),
}));

jest.mock('@cantoo/fontkit', () => ({}));

jest.mock('@cantoo/pdf-lib', () => {
  const create = jest.fn();
  const load = jest.fn();
  return { PDFDocument: { create, load }, rgb: () => ({}) };
});

const fs = require('../../../storage/fs');
const exportFile = require('../../../storage/exportFile');
const { processImage } = require('../processImage');
const { loadRegistryFonts } = require('../registryFonts');
const { PDFDocument } = require('@cantoo/pdf-lib');

const APPLICATION = {
  id: 'app-1' as ApplicationId,
  title: 'ВНЖ Сербия',
};

const SAVED = new Uint8Array([1, 2, 3]);

/** Журнал шагов сборки в порядке выполнения. */
let log: string[];

function fakePdf() {
  const pages: string[] = [];

  return {
    registerFontkit: jest.fn(),
    embedFont: jest.fn(async () => ({
      widthOfTextAtSize: (text: string, size: number) => text.length * size,
    })),
    embedJpg: jest.fn(async () => {
      log.push('embed-jpg');
      return {};
    }),
    copyPages: jest.fn(async (_source: unknown, indices: number[]) => {
      log.push('copy-pages');
      return indices.map(() => ({}));
    }),
    addPage: jest.fn(() => {
      pages.push('page');
      return { drawImage: jest.fn(), drawText: jest.fn() };
    }),
    insertPage: jest.fn(() => {
      pages.push('registry');
      return { drawText: jest.fn() };
    }),
    getPageCount: () => pages.length,
    save: jest.fn(async () => {
      log.push('save');
      return SAVED;
    }),
  };
}

function document(id: string, mimeType: string | null) {
  return {
    id: id as DocumentId,
    name: `${id}.file`,
    mimeType,
    sizeBytes: 1024,
    filePath: `documents/${id}`,
  };
}

function entry(id: string, label: string, documents: ReturnType<typeof document>[]) {
  return {
    itemId: id as ChecklistItemId,
    label,
    position: 0,
    documents,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  log = [];

  fs.assertEnoughSpace.mockImplementation(async () => {
    log.push('check-space');
  });
  fs.readFile.mockImplementation(async (path: string) => {
    log.push(`read ${path}`);
    return new Uint8Array([9, 9, 9]);
  });
  exportFile.clearExportDirectory.mockImplementation(async () => {
    log.push('clear');
  });
  exportFile.writeTemporaryExport.mockImplementation(async () => {
    log.push('write-temp');
    return '/cache/packages/package.tmp';
  });
  exportFile.finalizeExport.mockImplementation(async () => {
    log.push('finalize');
    return '/cache/packages/Пакет — ВНЖ Сербия.pdf';
  });
  processImage.mockImplementation(async () => {
    log.push('process-image');
    return {
      bytes: new Uint8Array([7]),
      width: 1000,
      height: 800,
      quality: null,
    };
  });
  loadRegistryFonts.mockResolvedValue({
    regular: new Uint8Array([1]),
    semibold: new Uint8Array([2]),
  });
  PDFDocument.create.mockImplementation(async () => fakePdf());
  PDFDocument.load.mockImplementation(async () => ({
    getPageIndices: () => [0, 1],
  }));
});

it('место проверяется до того, как прочитан первый файл', async () => {
  const plan = planPackage([
    entry('i1', 'Паспорт', [document('d1', 'application/pdf')]),
  ]);

  await buildPackage(APPLICATION, plan, () => {});

  expect(log.indexOf('check-space')).toBeLessThan(log.indexOf('read documents/d1'));
  expect(fs.assertEnoughSpace).toHaveBeenCalledWith(plan.estimatedBytes);
});

it('документы обрабатываются по одному в порядке чек-листа', async () => {
  const plan = planPackage([
    entry('i1', 'Фото', [document('d1', 'image/jpeg')]),
    entry('i2', 'Паспорт', [document('d2', 'application/pdf')]),
  ]);

  await buildPackage(APPLICATION, plan, () => {});

  expect(log).toEqual([
    'clear',
    'check-space',
    'read documents/d1',
    'process-image',
    'embed-jpg',
    'read documents/d2',
    'copy-pages',
    'save',
    'write-temp',
    'finalize',
  ]);
});

it('ход сборки сообщается по документам', async () => {
  const plan = planPackage([
    entry('i1', 'Фото', [document('d1', 'image/jpeg')]),
    entry('i2', 'Паспорт', [document('d2', 'application/pdf')]),
  ]);
  const progress: string[] = [];

  await buildPackage(APPLICATION, plan, value =>
    progress.push(`${value.processed}/${value.total}`),
  );

  expect(progress).toEqual(['1/2', '2/2']);
});

it('неподдерживаемый формат не читается с диска и попадает в реестр', async () => {
  const plan = planPackage([
    entry('i1', 'Резюме', [document('d1', 'application/msword')]),
  ]);

  const result = await buildPackage(APPLICATION, plan, () => {});

  expect(fs.readFile).not.toHaveBeenCalled();
  expect(result.registry[0]).toMatchObject({
    status: 'not-included',
    pageCount: 0,
  });
});

it('битый файл не срывает пакет — строка «не включено», сборка идёт дальше', async () => {
  fs.readFile.mockRejectedValueOnce(new Error('file-corrupted'));
  const plan = planPackage([
    entry('i1', 'Фото', [document('d1', 'image/jpeg')]),
    entry('i2', 'Паспорт', [document('d2', 'application/pdf')]),
  ]);

  const result = await buildPackage(APPLICATION, plan, () => {});

  expect(result.registry[0]).toMatchObject({ status: 'not-included' });
  expect(result.registry[1]).toMatchObject({ status: 'included' });
  expect(log).toContain('finalize');
});

it('пункт без файлов виден в реестре', async () => {
  const plan = planPackage([
    entry('i1', 'Паспорт', [document('d1', 'application/pdf')]),
    entry('i2', 'Справка', []),
  ]);

  const result = await buildPackage(APPLICATION, plan, () => {});

  expect(result.registry[1]).toMatchObject({
    itemLabel: 'Справка',
    fileName: null,
    status: 'no-file',
  });
});

it('пометка детектора качества доезжает до реестра', async () => {
  processImage.mockResolvedValue({
    bytes: new Uint8Array([7]),
    width: 10,
    height: 10,
    quality: 'blurry',
  });
  const plan = planPackage([
    entry('i1', 'Фото', [document('d1', 'image/jpeg')]),
  ]);

  const result = await buildPackage(APPLICATION, plan, () => {});

  expect(result.registry[0]?.quality).toBe('blurry');
  // Некачественный снимок сборку не блокирует.
  expect(result.registry[0]?.status).toBe('included');
});

it('целевой файл появляется только после успешного save', async () => {
  const plan = planPackage([
    entry('i1', 'Паспорт', [document('d1', 'application/pdf')]),
  ]);

  const result = await buildPackage(APPLICATION, plan, () => {});

  expect(log.indexOf('save')).toBeLessThan(log.indexOf('write-temp'));
  expect(log.indexOf('write-temp')).toBeLessThan(log.indexOf('finalize'));
  expect(exportFile.writeTemporaryExport).toHaveBeenCalledWith(SAVED);
  expect(result.filePath).toBe('/cache/packages/Пакет — ВНЖ Сербия.pdf');
  expect(result.fileName).toBe('Пакет — ВНЖ Сербия.pdf');
});

it('сбой шрифта — понятная ошибка сборки, а не «непредвиденная»', async () => {
  // Ровно этот случай дал «непредвиденную ошибку» на устройстве:
  // несовместимый fontkit падал внутри embedFont.
  PDFDocument.create.mockImplementation(async () => ({
    ...fakePdf(),
    registerFontkit: () => {
      throw new Error("Cannot read properties of undefined (reading 'pos')");
    },
  }));
  const plan = planPackage([
    entry('i1', 'Паспорт', [document('d1', 'application/pdf')]),
  ]);

  const error = await buildPackage(APPLICATION, plan, () => {}).catch(
    (e: unknown) => e,
  );

  expect(isPackageAssemblyError(error)).toBe(true);
  expect(exportFile.finalizeExport).not.toHaveBeenCalled();
});

it('сбой записи PDF — тоже ошибка сборки, а не молчание', async () => {
  PDFDocument.create.mockImplementation(async () => ({
    ...fakePdf(),
    save: async () => {
      throw new Error('out of memory');
    },
  }));
  const plan = planPackage([
    entry('i1', 'Паспорт', [document('d1', 'application/pdf')]),
  ]);

  const error = await buildPackage(APPLICATION, plan, () => {}).catch(
    (e: unknown) => e,
  );

  expect(isPackageAssemblyError(error)).toBe(true);
  expect(exportFile.writeTemporaryExport).not.toHaveBeenCalled();
});

it('не хватило места — сборка не начинается', async () => {
  fs.assertEnoughSpace.mockRejectedValue(new Error('not-enough-space'));
  const plan = planPackage([
    entry('i1', 'Паспорт', [document('d1', 'application/pdf')]),
  ]);

  await expect(buildPackage(APPLICATION, plan, () => {})).rejects.toThrow(
    'not-enough-space',
  );

  expect(fs.readFile).not.toHaveBeenCalled();
  expect(exportFile.finalizeExport).not.toHaveBeenCalled();
});
