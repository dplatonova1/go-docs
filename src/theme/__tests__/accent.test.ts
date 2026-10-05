/**
 * Контраст надписей на градиентных заливках — кнопки (`accent.ts`) и
 * активная вкладка (`tabs.ts`).
 *
 * Порог — 4.5:1 (WCAG AA), а не 7:1 палитры: на градиентах 7:1 не
 * достигается без потери цвета (решено 2026-10-05). Проверяется каждый
 * опорный цвет градиента — надпись должна читаться в любом месте кнопки.
 * Полупрозрачные слои (блик, белая дымка) не учитываются: на тёмных
 * заливках они лишь в углу, а на пастельных только осветляют фон под
 * тёмным текстом, то есть контраст повышают.
 */

import { DARK_ACCENTS, LIGHT_ACCENTS, type Accents } from '../accent';
import { lightColors, darkColors, type ThemeColors } from '../colors';
import { DARK_TABS, LIGHT_TABS, type TabsStyle } from '../tabs';

const AA_TEXT = 4.5;

/**
 * Осознанные исключения (решено 2026-10-05): заливка и тема, где
 * надпись ниже 4.5:1 по решению дизайна, а не по недосмотру. Каждое — с
 * причиной в `accent.ts`.
 */
const ACCEPTED_LOW_CONTRAST: readonly string[] = [
  // Пастельный голубой в светлой теме с белой надписью, 1.8–3:1: кнопка
  // «Собрать пакет» и активная вкладка (`tabs.ts`, LIGHT_TAB_FOREGROUND).
  'светлая тема/sky',
  'светлая тема/tab',
  // «Создать заявку» с жёлтым началом градиента, как на референсе:
  // белый 1.6–5.3:1.
  'тёмная тема/sunset',
  // Та же кнопка «Создать заявку» в светлой теме (2026-10-05).
  'светлая тема/sunset',
];

function channelToLinear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(start =>
    channelToLinear(parseInt(hex.slice(start, start + 2), 16)),
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Непрозрачные опорные цвета градиентов — `#RRGGBB` из строки слоёв. */
function gradientStops(backgroundImage: unknown): string[] {
  return typeof backgroundImage === 'string'
    ? backgroundImage.match(/#[0-9a-f]{6}/gi) ?? []
    : [];
}

describe.each<[string, Accents, TabsStyle, ThemeColors]>([
  ['светлая тема', LIGHT_ACCENTS, LIGHT_TABS, lightColors],
  ['тёмная тема', DARK_ACCENTS, DARK_TABS, darkColors],
])('%s', (name, accents, tabs, colors) => {
  describe.each(
    Object.entries(accents).filter(
      ([accent]) => !ACCEPTED_LOW_CONTRAST.includes(`${name}/${accent}`),
    ),
  )('заливка %s', (_accent, style) => {
    const stops = gradientStops(style.fill.backgroundImage);

    // У полупрозрачного «стекла» (`glass`) непрозрачных опорных цветов
    // нет — проверять нечего.
    const cases = stops.length > 0 ? stops : ['—'];

    it.each(cases)('надпись читается на %s не хуже 4.5:1', stop => {
      if (stop === '—') {
        return;
      }
      expect(contrast(style.foreground, stop)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  });

  // Исключённая вкладка — заглушкой: пустой таблицы `it.each` не принимает.
  it.each(
    ACCEPTED_LOW_CONTRAST.includes(`${name}/tab`)
      ? ['—']
      : gradientStops(tabs.activeFill.backgroundImage),
  )('подпись активной вкладки читается на %s не хуже 4.5:1', stop => {
    if (stop === '—') {
      return;
    }
    expect(contrast(tabs.activeForeground, stop)).toBeGreaterThanOrEqual(
      AA_TEXT,
    );
  });

  it('подпись неактивной вкладки читается на панели не хуже 4.5:1', () => {
    expect(
      contrast(tabs.inactiveForeground, colors.surfaceOpaque),
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
