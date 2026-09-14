/**
 * Провайдер темы под текущую системную тему.
 *
 * Должен стоять над любым компонентом со styled-стилями: без него
 * `props.theme` пустой, и стиль падает при обращении к цвету. Поэтому он
 * в корне приложения и в обёртке рендера в тестах компонентов.
 */

import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider } from 'styled-components/native';

import { darkTheme, lightTheme } from './theme';

type AppThemeProviderProps = {
  children: ReactNode;
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  // Темы — константы модуля, поэтому ссылка стабильна между рендерами и
  // styled-компоненты пересчитывают стили только при смене темы.
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
