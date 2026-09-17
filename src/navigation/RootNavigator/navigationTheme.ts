/**
 * Перевод темы приложения в тему React Navigation.
 *
 * Единственное место, где вид элемента описан не в `styles.ts` компонента
 * (ADR-0011): шапку и фон экранов рисует библиотека, и цвета ей нужно
 * передать её собственной структурой. Палитра при этом остаётся одна —
 * `src/theme/colors.ts`.
 */

import {
  DarkTheme,
  DefaultTheme,
  type Theme as NavigationTheme,
} from '@react-navigation/native';

import type { AppTheme } from '../../theme/theme';
import { FONTS } from '../../theme/typography';

/**
 * Шрифт шапки — тот же Onest, что и везде. Вес задаётся начертанием, а не
 * `fontWeight`: на Android он даёт искусственно утолщённый текст (см.
 * `theme/typography.ts`).
 */
const FONT_WEIGHT = '400' as const;

const fonts: NavigationTheme['fonts'] = {
  regular: { fontFamily: FONTS.regular, fontWeight: FONT_WEIGHT },
  medium: { fontFamily: FONTS.medium, fontWeight: FONT_WEIGHT },
  bold: { fontFamily: FONTS.semibold, fontWeight: FONT_WEIGHT },
  heavy: { fontFamily: FONTS.bold, fontWeight: FONT_WEIGHT },
};

export function toNavigationTheme(
  theme: AppTheme,
  isDark: boolean,
): NavigationTheme {
  const base = isDark ? DarkTheme : DefaultTheme;

  return {
    ...base,
    fonts,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      // Шапка — поверхность над фоном экрана, как карточки.
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.divider,
      notification: theme.colors.danger,
    },
  };
}
