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
 * У `secondary` фон совпадает с фоном экрана, поэтому границу кнопки
 * обозначает рамка `border` (3:1), как у поля ввода.
 */
export const VARIANT_COLORS = {
  primary: { background: 'primary', label: 'onPrimary', border: null },
  secondary: { background: 'surface', label: 'text', border: 'border' },
  danger: { background: 'dangerSurface', label: 'onDanger', border: null },
} as const satisfies Record<
  ButtonVariant,
  { background: ColorName; label: ColorName; border: ColorName | null }
>;
