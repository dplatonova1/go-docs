/**
 * Цвета интерфейса для светлой и тёмной системной темы.
 *
 * Без явного цвета текст React Native на Android рисуется чёрным при любой
 * теме, а фон окна в тёмной теме тёмно-серый. Вместе это чёрный текст на
 * тёмном фоне — экран выглядит пустым. Поэтому фон, текст и рамки каждый
 * компонент берёт отсюда, а не полагается на умолчания платформы.
 *
 * Контраст — требование доступности, а не вкус: текст держит не меньше
 * 7:1 к фону экрана и карточки (WCAG AAA), рамки элементов управления — не
 * меньше 3:1 (WCAG 1.4.11). Это проверяет тест в
 * `__tests__/colors.test.ts`, так что при подборе палитры незаметно
 * просадить контраст не выйдет.
 *
 * Палитра взята из темы tweakcn и адаптирована: цвета, не прошедшие пороги,
 * сдвинуты по светлоте с сохранением оттенка. У каждого изменённого цвета
 * в комментарии — исходное значение из темы; при обновлении темы сверяться
 * с ним. Не перенесены `sidebar-*`, `chart-*`, `popover`, `muted`,
 * `accent`, `input`, `ring`: для них в приложении нет элементов.
 */

import { useColorScheme } from 'react-native';

export type ThemeColors = {
  /** Фон экрана. */
  readonly background: string;
  /** Фон карточек поверх экрана. */
  readonly surface: string;
  /** Основной текст. */
  readonly text: string;
  /** Второстепенный текст: пояснения, плейсхолдеры. */
  readonly textSecondary: string;
  /** Фон основной кнопки. */
  readonly primary: string;
  /** Текст на `primary`. */
  readonly onPrimary: string;
  /**
   * Рамки полей ввода и кнопок-контуров — там, где рамка показывает
   * границу элемента. Не меньше 3:1 к фону.
   */
  readonly border: string;
  /**
   * Разделители и рамки карточек. Декоративный цвет, контраст не
   * нормирован — не использовать как единственную границу элемента
   * управления, для этого `border`.
   */
  readonly divider: string;
  /**
   * Текст ошибок. Цвет — не единственный признак ошибки: рядом всегда
   * есть текст, иначе её не различат люди с нарушением цветовосприятия.
   */
  readonly danger: string;
  /** Фон кнопки необратимого действия (удаление). */
  readonly dangerSurface: string;
  /** Текст на `dangerSurface`. */
  readonly onDanger: string;
};

export const lightColors: ThemeColors = {
  // Продублирован как фон окна Android до загрузки JS:
  // android/app/src/main/res/values/colors.xml. Менять вместе.
  background: '#FCFCFC',
  surface: '#FCFCFC',
  text: '#171717',
  // В теме `popover-foreground`. `muted-foreground` темы (#202020) почти
  // не отличается от основного текста и второстепенным не выглядит.
  textSecondary: '#525252',
  primary: '#96b3ff',
  onPrimary: '#1E2723',
  // В теме #DFDFDF — 1.3:1. Исходный цвет остался в `divider`.
  border: '#929292',
  divider: '#DFDFDF',
  // В теме #CA3214 — 5.2:1 как текст и 5.2:1 под белой надписью.
  danger: '#A42910',
  dangerSurface: '#A42910',
  onDanger: '#FFFCFC',
};

export const darkColors: ThemeColors = {
  // Продублирован в android/app/src/main/res/values-night/colors.xml.
  background: '#121212',
  surface: '#171717',
  text: '#E2E8F0',
  textSecondary: '#A2A2A2',
  primary: '#153da2',
  // В теме #DDE8E3 — 6.0:1.
  onPrimary: '#FFFFFF',
  // В теме #292929 — 1.3:1. Исходный цвет остался в `divider`.
  border: '#646464',
  divider: '#292929',
  // В теме текстового красного нет: `destructive` (#541C15) — фон кнопки,
  // как текст он даёт 1.4:1. Оттенок взят из светлой темы.
  danger: '#F1836D',
  dangerSurface: '#541C15',
  onDanger: '#EDE9E8',
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
