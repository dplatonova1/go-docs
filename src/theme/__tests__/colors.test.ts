/**
 * Контраст палитр по формуле WCAG 2.x.
 *
 * Проверяются обе темы: тёмную на глаз проверяют реже, а именно в ней
 * всплыл «пустой» экран с чёрным текстом на тёмном фоне.
 *
 * Текст проверяется и на фоне экрана, и на фоне карточки: в тёмной теме
 * карточка светлее экрана, и цвет, прошедший на экране, на карточке может
 * не пройти.
 */

import { darkColors, lightColors, type ThemeColors } from '../colors';

function channelToLinear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (match === null) {
    throw new Error(`Ожидался цвет вида #RRGGBB, получено: ${hex}`);
  }
  const [r, g, b] = match
    .slice(1)
    .map(part => channelToLinear(parseInt(part, 16)));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/**
 * Цвет `#RRGGBB` или `rgba(r, g, b, a)`, наложенный на непрозрачный
 * `background`, — как его увидит пользователь.
 */
function opaque(color: string, background: string): string {
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(color);
  if (rgba === null) {
    return color;
  }
  const alpha = Number(rgba[4]);
  const hex = [1, 3, 5]
    .map((start, i) => {
      const under = parseInt(background.slice(start, start + 2), 16);
      const over = Number(rgba[i + 1]);
      return Math.round(over * alpha + under * (1 - alpha))
        .toString(16)
        .padStart(2, '0');
    })
    .join('');
  return `#${hex}`;
}

function contrast(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each<[string, ThemeColors]>([
  ['светлая тема', lightColors],
  ['тёмная тема', darkColors],
])('%s', (_name, colors) => {
  describe.each(['background', 'surface'] as const)(
    'на фоне %s',
    groundName => {
      const ground = opaque(colors[groundName], colors.background);

      it.each(['text', 'textSecondary', 'danger'] as const)(
        '%s читается с контрастом не меньше 7:1',
        token => {
          expect(contrast(colors[token], ground)).toBeGreaterThanOrEqual(7);
        },
      );

      it('indicator (подпись активной вкладки) читается с контрастом не меньше 7:1', () => {
        expect(contrast(colors.indicator, ground)).toBeGreaterThanOrEqual(7);
      });

      it('рамки полей различимы с контрастом не меньше 3:1', () => {
        expect(contrast(colors.border, ground)).toBeGreaterThanOrEqual(3);
      });
    },
  );

  it('surfaceOpaque — это surface, наложенный на background', () => {
    // Шапка рисуется непрозрачным цветом, карточки — полупрозрачным;
    // на экране они должны совпадать.
    expect(colors.surfaceOpaque.toLowerCase()).toBe(
      opaque(colors.surface, colors.background).toLowerCase(),
    );
  });

  it('onPrimary читается на primary с контрастом не меньше 7:1', () => {
    expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(
      7,
    );
  });
});
