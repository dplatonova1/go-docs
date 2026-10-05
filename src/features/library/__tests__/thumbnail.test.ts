/**
 * Миниатюры: размер, типы и поведение при сбое.
 *
 * Сама картинка делается нативным модулем, которого в jest нет (мок в
 * `__mocks__/react-native-nitro-image.js` всегда отказывает). Поэтому
 * здесь проверяется то, что от натива не зависит: расчёт размера и то,
 * что сбой не превращается в исключение у вызывающего.
 */

import { analyzeImage, canHaveThumbnail, fitShortSide } from '../thumbnail';

describe('fitShortSide', () => {
  it('уменьшает так, что короткая сторона равна заданной', () => {
    expect(fitShortSide(3000, 4000, 160)).toEqual({ width: 160, height: 213 });
    expect(fitShortSide(4000, 3000, 160)).toEqual({ width: 213, height: 160 });
  });

  it('не увеличивает маленькие картинки', () => {
    expect(fitShortSide(100, 300, 160)).toEqual({ width: 100, height: 300 });
  });

  it('не делит на ноль у пустой картинки', () => {
    expect(fitShortSide(0, 0, 160)).toEqual({ width: 0, height: 0 });
  });
});

describe('canHaveThumbnail', () => {
  it('снимки — да, PDF и неизвестный тип — нет', () => {
    expect(canHaveThumbnail('image/jpeg')).toBe(true);
    expect(canHaveThumbnail('image/png')).toBe(true);
    expect(canHaveThumbnail('application/pdf')).toBe(false);
    expect(canHaveThumbnail(null)).toBe(false);
  });
});

describe('analyzeImage', () => {
  it('для PDF не делает ничего: ни миниатюры, ни пометки', async () => {
    await expect(
      analyzeImage(new Uint8Array([1]), 'application/pdf'),
    ).resolves.toEqual({ thumbnail: null, quality: null });
  });

  it('сбой разбора картинки — пустой результат, а не исключение', async () => {
    // Документ без миниатюры и пометки — просто документ с заглушкой в
    // плитке: прикрепление из-за этого падать не должно.
    await expect(
      analyzeImage(new Uint8Array([1, 2, 3]), 'image/jpeg'),
    ).resolves.toEqual({ thumbnail: null, quality: null });
  });
});
