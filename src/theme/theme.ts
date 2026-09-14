/**
 * Тема для styled-components.
 *
 * Палитры и требования к контрасту — в `colors.ts`; здесь только упаковка
 * их в объект, который styled-components передаёт каждому стилю как
 * `props.theme`. Тип подключён к styled-components в `styled.d.ts`.
 */

import { darkColors, lightColors, type ThemeColors } from './colors';

export type AppTheme = {
  readonly colors: ThemeColors;
};

export const lightTheme: AppTheme = { colors: lightColors };

export const darkTheme: AppTheme = { colors: darkColors };
