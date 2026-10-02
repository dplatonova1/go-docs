/**
 * Миниатюра документа для плитки превью — уменьшенная копия снимка,
 * сделанная один раз и хранимая в строке `documents` (колонка
 * `thumbnail`, миграция 4).
 *
 * Зачем: раньше превью расшифровывало исходный файл целиком при каждом
 * показе строки — до 2 МБ в памяти JS ради картинки размером 44 точки
 * (см. «Отложенные обязательства» в CLAUDE.md). Миниатюра весит
 * несколько килобайт, лежит в зашифрованной базе (SQLCipher) и
 * удаляется вместе со строкой документа — отдельного файла на диске и
 * его «сирот» нет.
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
 * Делает миниатюру из расшифрованных байтов снимка.
 *
 * @returns JPEG-байты миниатюры, либо `null` — тип без миниатюр или
 *   картинку не удалось разобрать.
 */
export async function makeThumbnail(
  source: Uint8Array,
  mimeType: string | null,
): Promise<Uint8Array | null> {
  if (!canHaveThumbnail(mimeType)) {
    return null;
  }

  try {
    const original = await Images.loadFromEncodedImageDataAsync({
      // `slice()` — буфер может быть представлением поверх большего
      // массива, а нативному слою нужен ровно этот кусок.
      buffer: source.slice().buffer,
      width: 0,
      height: 0,
      imageFormat: mimeType === 'image/png' ? 'png' : 'jpg',
    });

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
