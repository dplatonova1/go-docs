/**
 * Детектор некачественных снимков.
 *
 * Пороги подобраны грубо, поэтому проверяются не они, а поведение:
 * ровная тёмная картинка — «тёмная», гладкий градиент — «размытая»,
 * резкая шахматная доска — без претензий, незнакомый формат пикселей —
 * молчание вместо догадки.
 */

import { assessQuality, type PixelSample } from '../imageQuality';

const SIDE = 64;

/** RGBA-картинка, значение каждого пикселя задаётся функцией. */
function sample(
  luminance: (x: number, y: number) => number,
  pixelFormat = 'RGBA',
  side = SIDE,
): PixelSample {
  const data = new Uint8Array(side * side * 4);

  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const value = Math.max(0, Math.min(255, Math.round(luminance(x, y))));
      const base = (y * side + x) * 4;
      data[base] = value;
      data[base + 1] = value;
      data[base + 2] = value;
      data[base + 3] = 255;
    }
  }

  return { data, width: side, height: side, pixelFormat };
}

it('тёмный снимок помечается тёмным', () => {
  expect(assessQuality(sample(() => 20))).toBe('dark');
});

it('размытый снимок помечается размытым', () => {
  // Плавный градиент: перепадов яркости на границах нет.
  expect(assessQuality(sample(x => 100 + x))).toBe('blurry');
});

it('резкий снимок претензий не вызывает', () => {
  // Шахматная доска — сплошные резкие границы.
  expect(assessQuality(sample((x, y) => ((x + y) % 2 === 0 ? 30 : 230)))).toBe(
    null,
  );
});

it('тёмный и одновременно нерезкий считается тёмным', () => {
  // Иначе человек будет искать резкость там, где не хватает света.
  expect(assessQuality(sample(() => 15))).toBe('dark');
});

it('порядок каналов читается, а не угадывается', () => {
  const side = 64;
  const data = new Uint8Array(side * side * 4);

  // Яркость только в канале, который в BGRA стоит третьим.
  for (let index = 0; index < side * side; index += 1) {
    const base = index * 4;
    data[base] = 10;
    data[base + 1] = 10;
    data[base + 2] = 240;
    data[base + 3] = 255;
  }

  // Как RGBA это почти чёрная картинка с красным следом, как BGRA —
  // светлая синяя. Формат решает.
  expect(assessQuality({ data, width: side, height: side, pixelFormat: 'RGBA' })).toBe(
    'dark',
  );
  expect(assessQuality({ data, width: side, height: side, pixelFormat: 'BGRA' })).not.toBe(
    'dark',
  );
});

it('незнакомый формат пикселей — молчание, а не догадка', () => {
  expect(assessQuality(sample(() => 20, 'unknown'))).toBe(null);
});

it('буфер короче обещанного размера — молчание, а не чтение за краем', () => {
  expect(
    assessQuality({
      data: new Uint8Array(16),
      width: SIDE,
      height: SIDE,
      pixelFormat: 'RGBA',
    }),
  ).toBe(null);
});

it('слишком маленькая картинка не проверяется', () => {
  expect(assessQuality(sample(() => 5, 'RGBA', 8))).toBe(null);
});
