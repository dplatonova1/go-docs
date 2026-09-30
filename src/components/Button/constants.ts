import type { ThemeColors } from '../../theme/colors';
import type { ButtonVariant } from './types';

/** Прозрачность нажатой кнопки — видимый отклик на касание. */
export const PRESSED_OPACITY = 0.6;

/** Прозрачность недоступной кнопки. */
export const DISABLED_OPACITY = 0.4;

type ColorName = keyof ThemeColors;

/**
 * Цвета вариантов — имена из палитры, а не значения: так пары
 * «надпись/фон» остаются теми, контраст которых проверяет
 * `theme/__tests__/colors.test.ts`.
 *
 * У `secondary` своя заливка и мягкая рамка `secondaryBorder` — почему
 * она не держит 3:1, см. `theme/colors.ts`. `danger` — контур: заливка
 * цвета фона, красные надпись и рамка.
 */
export const VARIANT_COLORS = {
  primary: {
    background: 'primary',
    label: 'onPrimary',
    border: null,
  },
  secondary: {
    background: 'secondarySurface',
    label: 'text',
    border: 'secondaryBorder',
  },
  // Не заливка, а контур: сплошная красная кнопка выглядела угрожающе
  // (решено 2026-09-29). Заливка — фон экрана, а не `secondarySurface`:
  // на более светлой заливке красный текст тёмной темы не держит 7:1.
  danger: {
    background: 'background',
    label: 'danger',
    border: 'danger',
  },
} as const satisfies Record<
  ButtonVariant,
  {
    background: ColorName;
    label: ColorName;
    border: ColorName | null;
  }
>;
