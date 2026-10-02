import type { AccentName } from '../../theme/accent';
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
 * `accent` — заливка из `theme.accents` поверх `background`: градиент,
 * форма пилюли и свой цвет надписи вместо `label`. У `danger` это `rose`
 * (решено 2026-10-01; прежде был красный контур), у `secondary` —
 * `glass` (решено 2026-10-02; прежде серая заливка с рамкой).
 *
 * `background: null` — без своей заливки: полупрозрачное «стекло»
 * `secondary` должно пропускать то, что под ним, — экран или карточку.
 */
export const VARIANT_COLORS = {
  primary: {
    background: 'primary',
    label: 'onPrimary',
    border: null,
    accent: null,
  },
  secondary: {
    background: null,
    label: 'text',
    border: null,
    accent: 'glass',
  },
  // Приглушённая, а не сплошная красная: такая выглядела угрожающе
  // (решено 2026-09-29). Необратимость сообщают надпись и подтверждение.
  danger: {
    background: 'background',
    label: 'danger',
    border: null,
    accent: 'rose',
  },
} as const satisfies Record<
  ButtonVariant,
  {
    background: ColorName | null;
    label: ColorName;
    border: ColorName | null;
    accent: AccentName | null;
  }
>;
