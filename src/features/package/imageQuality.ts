/**
 * Детектор некачественных снимков.
 *
 * Ведомство не примет размытый или тёмный скан, а человек этого на
 * экране телефона часто не видит. Проверка дешёвая и заведомо
 * приблизительная: она ставит пометку в реестре и **никогда не блокирует
 * сборку** — решение остаётся за человеком.
 *
 * Как считается, по уменьшенной до ~256px копии в оттенках серого:
 *
 * - **тёмный** — средняя яркость ниже порога. Проверяется первым: у
 *   тёмного снимка и контраст низкий, иначе он попал бы в «размытые»;
 * - **размытый** — дисперсия лапласиана (классическая мера резкости)
 *   ниже порога. У резкого снимка на границах объектов большие перепады
 *   яркости, у размытого их нет.
 *
 * Пороги подобраны грубо и на устройстве не проверялись — см.
 * «Отложенные обязательства» в CLAUDE.md. Ошибка в сторону «всё хорошо»
 * здесь лучше: ложная тревога на каждом втором документе приучит
 * пропускать предупреждения не глядя.
 *
 * Модуль чистый: на вход — сырые пиксели, на выход — пометка. Нативной
 * части нет, поэтому проверяется обычными тестами.
 */

import type { QualityFlag } from './types';

/** Средняя яркость ниже — снимок считается тёмным. Шкала 0…255. */
const DARK_MEAN_LUMINANCE = 60;

/** Дисперсия лапласиана ниже — снимок считается размытым. */
const BLUR_LAPLACIAN_VARIANCE = 90;

/**
 * Совсем маленькие картинки не проверяются: на них лапласиан
 * неинформативен, а ложная пометка хуже пропущенной.
 */
const MIN_SIDE_FOR_CHECK = 32;

/**
 * Сырые пиксели так, как их отдаёт нативный слой.
 *
 * Порядок байтов зависит от платформы и от самой картинки, поэтому
 * формат приходит значением и читается, а не угадывается.
 */
export type PixelSample = {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  /** `RGBA`, `BGRA`, `RGB`, … — как в `react-native-nitro-image`. */
  readonly pixelFormat: string;
};

type ChannelOffsets = {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly stride: number;
};

/**
 * Смещения каналов внутри пикселя.
 *
 * `null` — формат незнакомый: тогда проверка не делается вовсе. Считать
 * яркость по наугад взятым байтам — верный способ пометить нормальный
 * снимок тёмным.
 */
function offsetsOf(pixelFormat: string): ChannelOffsets | null {
  switch (pixelFormat) {
    case 'RGBA':
    case 'RGBX':
      return { red: 0, green: 1, blue: 2, stride: 4 };
    case 'BGRA':
    case 'BGRX':
      return { red: 2, green: 1, blue: 0, stride: 4 };
    case 'ARGB':
    case 'XRGB':
      return { red: 1, green: 2, blue: 3, stride: 4 };
    case 'ABGR':
    case 'XBGR':
      return { red: 3, green: 2, blue: 1, stride: 4 };
    case 'RGB':
      return { red: 0, green: 1, blue: 2, stride: 3 };
    case 'BGR':
      return { red: 2, green: 1, blue: 0, stride: 3 };
    default:
      return null;
  }
}

/** Яркость по ITU-R BT.601 — та же формула, что у обычного «обесцвечивания». */
function toGrayscale(
  sample: PixelSample,
  offsets: ChannelOffsets,
): Float32Array | null {
  const { data, width, height } = sample;
  const pixels = width * height;

  if (data.length < pixels * offsets.stride) {
    // Буфер короче, чем обещают размеры: читать за его пределами нельзя.
    return null;
  }

  const gray = new Float32Array(pixels);

  for (let index = 0; index < pixels; index += 1) {
    const base = index * offsets.stride;
    gray[index] =
      0.299 * (data[base + offsets.red] ?? 0) +
      0.587 * (data[base + offsets.green] ?? 0) +
      0.114 * (data[base + offsets.blue] ?? 0);
  }

  return gray;
}

function meanOf(values: Float32Array): number {
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index] ?? 0;
  }
  return values.length === 0 ? 0 : sum / values.length;
}

/**
 * Дисперсия лапласиана: для каждого внутреннего пикселя берётся
 * `4*центр − сосед сверху − снизу − слева − справа`, и считается
 * разброс этих значений.
 */
function laplacianVariance(
  gray: Float32Array,
  width: number,
  height: number,
): number {
  const values: number[] = [];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      values.push(
        4 * (gray[index] ?? 0) -
          (gray[index - width] ?? 0) -
          (gray[index + width] ?? 0) -
          (gray[index - 1] ?? 0) -
          (gray[index + 1] ?? 0),
      );
    }
  }

  if (values.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return variance;
}

/**
 * @returns пометка о качестве или `null`, если претензий нет либо
 *   проверить не получилось.
 */
export function assessQuality(sample: PixelSample): QualityFlag | null {
  if (
    sample.width < MIN_SIDE_FOR_CHECK ||
    sample.height < MIN_SIDE_FOR_CHECK
  ) {
    return null;
  }

  const offsets = offsetsOf(sample.pixelFormat);
  if (offsets === null) {
    return null;
  }

  const gray = toGrayscale(sample, offsets);
  if (gray === null) {
    return null;
  }

  if (meanOf(gray) < DARK_MEAN_LUMINANCE) {
    return 'dark';
  }

  return laplacianVariance(gray, sample.width, sample.height) <
    BLUR_LAPLACIAN_VARIANCE
    ? 'blurry'
    : null;
}
