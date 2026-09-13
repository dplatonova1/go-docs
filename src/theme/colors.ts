/**
 * Цвета интерфейса для светлой и тёмной системной темы.
 *
 * Без явного цвета текст React Native на Android рисуется чёрным при любой
 * теме, а фон окна в тёмной теме тёмно-серый. Вместе это чёрный текст на
 * тёмном фоне — экран выглядит пустым. Поэтому фон, текст и рамки каждый
 * компонент берёт отсюда, а не полагается на умолчания платформы.
 *
 * Контраст — требование доступности, а не вкус: текст держит не меньше
 * 7:1 к фону (WCAG AAA), рамки элементов управления — не меньше 3:1
 * (WCAG 1.4.11). Это проверяет тест в `__tests__/colors.test.ts`, так что
 * при подборе финальной палитры незаметно просадить контраст не выйдет.
 *
 * Заготовка: палитра нейтральная, финальный дизайн будет позже.
 */

import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeColors = {
  /** Фон экрана. */
  readonly background: string;
  /** Основной текст. */
  readonly text: string;
  /** Второстепенный текст: пояснения, плейсхолдеры. */
  readonly textSecondary: string;
  /** Рамки кнопок и полей, разделители. */
  readonly border: string;
  /**
   * Текст ошибок. Цвет — не единственный признак ошибки: рядом всегда
   * есть текст, иначе её не различат люди с нарушением цветовосприятия.
   */
  readonly danger: string;
};

export const lightColors: ThemeColors = {
  background: '#FFFFFF',
  text: '#111111',
  textSecondary: '#4A4A4A',
  border: '#767676',
  danger: '#B00020',
};

export const darkColors: ThemeColors = {
  background: '#121212',
  text: '#F2F2F2',
  textSecondary: '#BDBDBD',
  border: '#8A8A8A',
  danger: '#FF8A80',
};

/**
 * Палитра под текущую системную тему.
 *
 * Возвращает один из двух объектов-констант, поэтому ссылка стабильна
 * между рендерами и годится в зависимости `useMemo`.
 */
export function useThemeColors(): ThemeColors {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}

/**
 * Стили, зависящие от темы.
 *
 * Цвет нельзя положить в модульный `StyleSheet.create`, а инлайн-объект
 * в JSX запрещён конвенцией (см. `src/components/README.md`). Поэтому
 * цветовые стили собираются фабрикой и пересоздаются только при смене
 * темы.
 *
 * `create` должна быть объявлена на уровне модуля, а не внутри
 * компонента: иначе она новая на каждый рендер и `useMemo` бесполезен.
 */
export function useThemedStyles<T>(create: (colors: ThemeColors) => T): T {
  const colors = useThemeColors();
  return useMemo(() => create(colors), [create, colors]);
}
