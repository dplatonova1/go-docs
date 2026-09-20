/**
 * Подготовка снимка к встраиванию в пакет.
 *
 * Уменьшение до 2000px по длинной стороне и JPEG 85 — компромисс между
 * читаемостью печати и размером файла: на бумаге A4 с 2000px выходит
 * около 170 dpi, этого хватает и для текста в скане, и для фотографии.
 * Оригинал на диске не меняется — сжимается только копия для пакета.
 *
 * Работа идёт через `react-native-nitro-image`: картинка уже в памяти
 * (файл расшифрован), поэтому загружается из буфера, а не из файла —
 * иначе пришлось бы писать расшифрованную копию на диск.
 *
 * Память: на каждый снимок здесь живут исходные байты, распакованный
 * нативный Bitmap и сжатый результат. Функция ничего не удерживает
 * между вызовами — вызывающий обрабатывает документы по одному и
 * отпускает результат перед следующим.
 */

import { Images } from 'react-native-nitro-image';

import { assessQuality } from './imageQuality';
import type { QualityFlag } from './types';

/** Длинная сторона результата. */
const MAX_LONG_SIDE = 2000;

/** Качество JPEG. */
const JPEG_QUALITY = 85;

/**
 * Длинная сторона копии, по которой оценивается качество. Маленькая
 * намеренно: детектору нужны пропорции перепадов яркости, а не детали,
 * а разбор пикселей идёт в JS.
 */
const QUALITY_SAMPLE_LONG_SIDE = 256;

export type ProcessedImage = {
  /** Сжатый JPEG. */
  readonly bytes: Uint8Array;
  readonly width: number;
  readonly height: number;
  /** Пометка детектора качества или `null`. */
  readonly quality: QualityFlag | null;
};

/** Размер после вписывания в квадрат `maxLongSide`, без увеличения. */
export function fitWithin(
  width: number,
  height: number,
  maxLongSide: number,
): { width: number; height: number } {
  const longSide = Math.max(width, height);

  if (longSide <= maxLongSide || longSide === 0) {
    return { width, height };
  }

  const scale = maxLongSide / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Формат для нативного загрузчика: он читает контейнер из самих байтов. */
function imageFormatOf(mimeType: string | null): 'jpg' | 'png' {
  return mimeType === 'image/png' ? 'png' : 'jpg';
}

export async function processImage(
  source: Uint8Array,
  mimeType: string | null,
): Promise<ProcessedImage> {
  const original = await Images.loadFromEncodedImageDataAsync({
    // `slice()` — буфер документа может быть представлением поверх
    // большего массива, а нативному слою нужен ровно этот кусок.
    buffer: source.slice().buffer,
    width: 0,
    height: 0,
    imageFormat: imageFormatOf(mimeType),
  });

  const target = fitWithin(original.width, original.height, MAX_LONG_SIDE);
  const resized =
    target.width === original.width && target.height === original.height
      ? original
      : await original.resizeAsync(target.width, target.height);

  const quality = await assessResized(resized);
  const encoded = await resized.toEncodedImageDataAsync('jpg', JPEG_QUALITY);

  return {
    bytes: new Uint8Array(encoded.buffer),
    width: encoded.width,
    height: encoded.height,
    quality,
  };
}

/**
 * Оценка качества по уменьшенной копии.
 *
 * Сбой детектора не должен ронять сборку: пакет без пометки о качестве
 * всё равно пакет, а вот пакета без страницы из-за неудачной проверки
 * быть не должно.
 */
async function assessResized(image: {
  width: number;
  height: number;
  resizeAsync: (
    width: number,
    height: number,
  ) => Promise<{
    toRawPixelDataAsync: () => Promise<{
      buffer: ArrayBuffer;
      width: number;
      height: number;
      pixelFormat: string;
    }>;
  }>;
}): Promise<QualityFlag | null> {
  try {
    const sampleSize = fitWithin(
      image.width,
      image.height,
      QUALITY_SAMPLE_LONG_SIDE,
    );
    const sample = await image.resizeAsync(sampleSize.width, sampleSize.height);
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
