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
 * Контраст (2026-10-05): белый на активной пилюле и приглушённый цвет
 * неактивных — не ниже 4.5:1 (WCAG AA); порог `colors.ts` (7:1) для
 * градиентов не достигается без потери цвета.
 */

import type { ViewStyle } from 'react-native';

import { rim } from './helpers';

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

/**
 * Градиенты активной вкладки. Их же берёт голубая кнопка `sky`
 * (`accent.ts`, решено 2026-10-02): главное действие экрана и активная
 * вкладка — один цвет, в каждой теме свой.
 */
// Тёмная затемнена 2026-10-05, чтобы белый держал 4.5:1 (WCAG AA) по
// всей длине: прежде #72BCFF → #6A90FC → #AA5EFC давал 1.8–3.7:1.
export const DARK_TAB_GRADIENT =
  'linear-gradient(120deg, #0075E0 0%, #386BFB 45%, #9B42FB 100%)';
// Светлая — пастельный голубой с тёмной надписью (решено 2026-10-05):
// тёмный градиент с белой надписью на светлом экране был тяжёлым.
export const LIGHT_TAB_GRADIENT =
  'linear-gradient(120deg, #93C8FC 0%, #7EA8FC 45%, #B773FE 100%)';

/**
 * Надпись на светлой пастели — белая (решено 2026-10-05, после пробы
 * тёмно-синей #20295B): 1.8–3:1, ниже 4.5:1, принято осознанно —
 * исключение в `accent.test.ts`. Рамка — тёмно-синяя с плотностью 18%
 * (сначала 28%, как у «Прикреплено», — вышло резковато). Их же берёт голубая
 * кнопка `sky`.
 */
export const LIGHT_TAB_FOREGROUND = '#FFFFFF';
export const LIGHT_TAB_BORDER = 'rgba(32, 41, 91, 0.18)';

/** Свечение под активной вкладкой и под кнопкой `sky`. */
export const DARK_TAB_GLOW = 'rgba(110, 120, 250, 0.45)';
export const LIGHT_TAB_GLOW = 'rgba(150, 140, 250, 0.35)';

export const DARK_TABS: TabsStyle = {
  activeFill: {
    backgroundImage: DARK_TAB_GRADIENT,
    boxShadow: [
      rim('rgba(255, 255, 255, 0.25)'),
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
      rim(LIGHT_TAB_BORDER),
      {
        offsetX: 0,
        offsetY: 6,
        blurRadius: 16,
        spreadDistance: -4,
        color: LIGHT_TAB_GLOW,
      },
    ],
  },
  activeForeground: LIGHT_TAB_FOREGROUND,
  inactiveBubble: 'rgba(120, 140, 190, 0.1)',
  // Затемнялся вслед за панелью: #6F7689 → #666C7E (2026-10-05) →
  // #646A7B (фон #CBD3E5, 2026-10-06), не ниже 4.5:1.
  inactiveForeground: '#646A7B',
};
