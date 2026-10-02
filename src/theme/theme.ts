/**
 * Тема для styled-components.
 *
 * Палитры и требования к контрасту — в `colors.ts`, акцентные заливки —
 * в `accent.ts`, карточка — в `card.ts`, поле ввода — в `field.ts`, вкладки — в `tabs.ts`; здесь
 * только упаковка их в объект, который styled-components передаёт
 * каждому стилю как `props.theme`. Тип подключён к styled-components в
 * `styled.d.ts`.
 */

import {
  DARK_ACCENTS,
  LIGHT_ACCENTS,
  SPINNER_STOPS,
  type Accents,
} from './accent';
import { DARK_CARD, LIGHT_CARD, type CardStyle } from './card';
import { darkColors, lightColors, type ThemeColors } from './colors';
import {
  DARK_FIELD,
  LIGHT_FIELD,
  type FieldStyle,
  type GradientStop,
} from './field';
import { DARK_TABS, LIGHT_TABS, type TabsStyle } from './tabs';

export type AppTheme = {
  readonly colors: ThemeColors;
  readonly accents: Accents;
  /** Карточка: слои, плитка картинки, разделитель — см. `card.ts`. */
  readonly card: CardStyle;
  /** Поле ввода в покое и в фокусе, см. `field.ts`. */
  readonly field: FieldStyle;
  /** Вкладки нижней панели, см. `tabs.ts`. */
  readonly tabs: TabsStyle;
  /** Градиент лоадера, см. `accent.ts`. */
  readonly spinner: readonly GradientStop[];
};

export const lightTheme: AppTheme = {
  colors: lightColors,
  accents: LIGHT_ACCENTS,
  card: LIGHT_CARD,
  field: LIGHT_FIELD,
  tabs: LIGHT_TABS,
  spinner: SPINNER_STOPS,
};

export const darkTheme: AppTheme = {
  colors: darkColors,
  accents: DARK_ACCENTS,
  card: DARK_CARD,
  field: DARK_FIELD,
  tabs: DARK_TABS,
  spinner: SPINNER_STOPS,
};
