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

function contrast(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each<[string, ThemeColors]>([
  ['светлая тема', lightColors],
  ['тёмная тема', darkColors],
])('%s', (_name, colors) => {
  describe.each(['background', 'surface'] as const)('на фоне %s', ground => {
    it.each(['text', 'textSecondary', 'danger'] as const)(
      '%s читается с контрастом не меньше 7:1',
      token => {
        expect(contrast(colors[token], colors[ground])).toBeGreaterThanOrEqual(
          7,
        );
      },
    );

    it('рамки полей различимы с контрастом не меньше 3:1', () => {
      expect(contrast(colors.border, colors[ground])).toBeGreaterThanOrEqual(
        3,
      );
    });
  });

  it.each([
    ['onPrimary', 'primary'],
    ['onDanger', 'dangerSurface'],
  ] as const)('%s читается на %s с контрастом не меньше 7:1', (text, fill) => {
    expect(contrast(colors[text], colors[fill])).toBeGreaterThanOrEqual(7);
  });
});
