/**
 * Вкладки нижней панели — с референса «Alternative style» (решено
 * 2026-10-02). С референса взяты форма, цвета и состояния вкладок; сама
 * панель, иконки и шрифты — прежние.
 *
 * - Активная: пилюля с диагональным градиентом голубой → синий →
 *   фиолетовый (тёмная: #72BCFF → #6A90FC → #AA5EFC, светлая — пастельнее),
 *   белые иконка и подпись, свечение снизу.
 * - Неактивная: иконка в едва заметном круге, иконка и подпись
 *   приглушённые синевато-серые.
 *
 * Контраст белого на активной пилюле — 1.8–3.7:1, приглушённого цвета в
 * светлой теме — около 4:1, ниже порога `colors.ts`. Принято вместе с
 * остальными градиентами до общего разбора контраста.
 */

import type { BoxShadowValue, ViewStyle } from 'react-native';

export type TabsStyle = {
  /** Заливка активной вкладки: градиент, кант, свечение. */
  readonly activeFill: ViewStyle;
  /** Иконка и подпись активной вкладки. */
  readonly activeForeground: string;
  /** Круг под иконкой неактивной вкладки. */
  readonly inactiveBubble: string;
  /** Иконка и подпись неактивной вкладки. */
  readonly inactiveForeground: string;
};

/** Кант в 1 точку внутренней тенью — как у кнопок. */
const RIM: BoxShadowValue = {
  inset: true,
  offsetX: 0,
  offsetY: 0,
  blurRadius: 0,
  spreadDistance: 1,
  color: 'rgba(255, 255, 255, 0.25)',
};

/**
 * Градиенты активной вкладки. Их же берёт голубая кнопка `sky`
 * (`accent.ts`, решено 2026-10-02): главное действие экрана и активная
 * вкладка — один цвет.
 */
export const DARK_TAB_GRADIENT =
  'linear-gradient(120deg, #72BCFF 0%, #6A90FC 45%, #AA5EFC 100%)';
export const LIGHT_TAB_GRADIENT =
  'linear-gradient(120deg, #93C8FC 0%, #7EA8FC 45%, #B773FE 100%)';

/** Свечение под активной вкладкой и под кнопкой `sky`. */
export const DARK_TAB_GLOW = 'rgba(110, 120, 250, 0.45)';
export const LIGHT_TAB_GLOW = 'rgba(150, 140, 250, 0.35)';

export const DARK_TABS: TabsStyle = {
  activeFill: {
    backgroundImage: DARK_TAB_GRADIENT,
    boxShadow: [
      RIM,
      {
        offsetX: 0,
        offsetY: 6,
        blurRadius: 16,
        spreadDistance: -4,
        color: DARK_TAB_GLOW,
      },
    ],
  },
  activeForeground: '#FFFFFF',
  inactiveBubble: 'rgba(140, 150, 255, 0.12)',
  inactiveForeground: '#9FB0F0',
};

export const LIGHT_TABS: TabsStyle = {
  activeFill: {
    backgroundImage: LIGHT_TAB_GRADIENT,
    boxShadow: [
      RIM,
      {
        offsetX: 0,
        offsetY: 6,
        blurRadius: 16,
        spreadDistance: -4,
        color: LIGHT_TAB_GLOW,
      },
    ],
  },
  activeForeground: '#FFFFFF',
  inactiveBubble: 'rgba(120, 140, 190, 0.1)',
  inactiveForeground: '#6F7689',
};
