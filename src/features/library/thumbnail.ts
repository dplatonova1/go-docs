/**
 * Миниатюра документа для плитки превью — уменьшенная копия снимка,
 * сделанная один раз и хранимая зашифрованным файлом
 * `thumbnails/<id документа>` рядом с исходником в `documents/`. В базе о
 * ней ничего нет: там только метаданные (решено 2026-10-05; до того —
 * колонка `documents.thumbnail`, миграции 4–5). Путь выводится из id
 * документа, отдельная колонка не нужна.
 *
 * Зачем: раньше превью расшифровывало исходный файл целиком при каждом
 * показе строки — до 2 МБ в памяти JS ради картинки размером 44 точки
 * (см. «Отложенные обязательства» в CLAUDE.md). Миниатюра весит
 * несколько килобайт и шифруется тем же ключом, что и документы
 * (`storage/fs.ts`). Удаляется вместе с документом
 * (`deleteDocumentFromLibrary`); прерванная запись или удаление может
 * оставить «сироту» — тот же принятый компромисс, что у файлов документов
 * (ADR-0012, раздел 4). Чтение, запись и удаление файла — в
 * [`thumbnailStore.ts`](./thumbnailStore.ts); здесь только изготовление,
 * без хранилища.
 *
 * Делается так же, как сжатие снимка для пакета
 * ([`processImage`](../package/processImage.ts)): через
 * `react-native-nitro-image` прямо из буфера в памяти, без записи
 * расшифрованной копии на диск.
 *
 * Сбой здесь никогда не ошибка для вызывающего: документ без миниатюры
 * — просто документ с заглушкой в плитке. Поэтому функция не бросает, а
 * возвращает `null`.
 */

import { Images } from 'react-native-nitro-image';

import { assessQuality } from '../package/imageQuality';
import { fitWithin } from '../package/processImage';
import type { QualityFlag } from '../package/types';

/**
 * Короткая сторона миниатюры в пикселях. Плитка — 44 точки и картинка в
 * ней обрезается по короткой стороне (`cover`), поэтому важна именно
 * она: 160 px хватает на экран с плотностью до 3.5x.
 */
const THUMBNAIL_SHORT_SIDE = 160;

/** Качество JPEG: для картинки в 44 точки больше не нужно. */
const THUMBNAIL_JPEG_QUALITY = 75;

/** Формат миниатюры — всегда JPEG, независимо от исходника. */
export const THUMBNAIL_MIME_TYPE = 'image/jpeg';

/** Типы, из которых делается миниатюра. PDF без рендерера страниц — нет. */
const THUMBNAILABLE_MIME_TYPES: readonly string[] = ['image/jpeg', 'image/png'];

export function canHaveThumbnail(mimeType: string | null): boolean {
  return mimeType !== null && THUMBNAILABLE_MIME_TYPES.includes(mimeType);
}

/**
 * Размер, при котором короткая сторона равна `shortSide`, без
 * увеличения.
 */
export function fitShortSide(
  width: number,
  height: number,
  shortSide: number,
): { width: number; height: number } {
  const current = Math.min(width, height);

  if (current <= shortSide || current === 0) {
    return { width, height };
  }

  const scale = shortSide / current;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Длинная сторона копии для детектора качества — та же, что при сборке
 * пакета (`package/processImage.ts`): пороги детектора подобраны под неё.
 */
const QUALITY_SAMPLE_LONG_SIDE = 256;

/** Что даёт один проход по снимку при прикреплении. */
export type ImageAnalysis = {
  /** JPEG-байты миниатюры или `null`, если сделать не удалось. */
  readonly thumbnail: Uint8Array | null;
  /**
   * Пометка детектора качества (`documents.quality_flag`) или `null` —
   * замечаний нет либо проверить не получилось.
   */
  readonly quality: QualityFlag | null;
};

const NOTHING: ImageAnalysis = { thumbnail: null, quality: null };

/**
 * Один проход по расшифрованному снимку: миниатюра для плитки и оценка
 * качества (тёмный, размытый) — решено 2026-09-22, сделано 2026-10-05.
 * Картинка разбирается один раз; оба результата — из неё.
 *
 * Не бросает: сбой миниатюры или детектора — это просто их отсутствие,
 * прикрепление из-за этого не падает.
 */
export async function analyzeImage(
  source: Uint8Array,
  mimeType: string | null,
): Promise<ImageAnalysis> {
  if (!canHaveThumbnail(mimeType)) {
    return NOTHING;
  }

  let original;
  try {
    original = await Images.loadFromEncodedImageDataAsync({
      // `slice()` — буфер может быть представлением поверх большего
      // массива, а нативному слою нужен ровно этот кусок.
      buffer: source.slice().buffer,
      width: 0,
      height: 0,
      imageFormat: mimeType === 'image/png' ? 'png' : 'jpg',
    });
  } catch {
    return NOTHING;
  }

  const [thumbnail, quality] = await Promise.all([
    encodeThumbnail(original),
    assessOriginal(original),
  ]);
  return { thumbnail, quality };
}

type LoadedImage = Awaited<
  ReturnType<typeof Images.loadFromEncodedImageDataAsync>
>;

async function encodeThumbnail(
  original: LoadedImage,
): Promise<Uint8Array | null> {
  try {
    const target = fitShortSide(
      original.width,
      original.height,
      THUMBNAIL_SHORT_SIDE,
    );
    const resized =
      target.width === original.width && target.height === original.height
        ? original
        : await original.resizeAsync(target.width, target.height);
    const encoded = await resized.toEncodedImageDataAsync(
      'jpg',
      THUMBNAIL_JPEG_QUALITY,
    );
    return new Uint8Array(encoded.buffer);
  } catch {
    return null;
  }
}

async function assessOriginal(
  original: LoadedImage,
): Promise<QualityFlag | null> {
  try {
    const size = fitWithin(
      original.width,
      original.height,
      QUALITY_SAMPLE_LONG_SIDE,
    );
    const sample = await original.resizeAsync(size.width, size.height);
    const pixels = await sample.toRawPixelDataAsync();
    return assessQuality({
      data: new Uint8Array(pixels.buffer),
      width: pixels.width,
      height: pixels.height,
      pixelFormat: pixels.pixelFormat,
    });
  } catch {
    return null;
  }
}
