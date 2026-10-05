/**
 * Оформление поля ввода — с референса «Text input» (решено 2026-10-01),
 * без иконки.
 *
 * - Покой: заливка `colors.surface`, сверху чуть светлее, светлый кант
 *   по краю. В светлой теме ещё мягкая тень снизу.
 * - Фокус: рамка с градиентом слева направо — жёлтый → розовый →
 *   фиолетовый → голубой, вокруг свечение: тёплое слева, голубое
 *   справа. В светлой теме те же цвета пастелью.
 * - Отключено: та же форма, тусклее текст (это делает `TextField`).
 *
 * Градиентную рамку рисует `TextField` через `react-native-svg`: у
 * `borderColor` градиента нет, а `backgroundImage` под рамкой
 * повторяется с противоположного края (см. `accent.ts`). Здесь только
 * её цвета.
 */

import type { ViewStyle } from 'react-native';

import { rim } from './helpers';

/** Опорная точка градиента рамки: доля ширины поля и цвет. */
export type GradientStop = {
  readonly offset: number;
  readonly color: string;
};

export type FieldStyle = {
  /** Поле в покое: блик, кант, тень. */
  readonly rest: ViewStyle;
  /** Поле в фокусе — вместо `rest`: ярче заливка, свечение вокруг. */
  readonly focused: ViewStyle;
  /** Градиент рамки в фокусе, слева направо. */
  readonly focusBorder: readonly GradientStop[];
};

// Тёмная: на референсе тело поля сверху #1C264A, снизу #162043 —
// светлее и синее фона; верхний кант #2C395B.
const DARK_SHEEN =
  'linear-gradient(180deg, rgba(150, 170, 255, 0.07) 0%, ' +
  'rgba(150, 170, 255, 0) 100%)';

export const DARK_FIELD: FieldStyle = {
  rest: {
    backgroundImage: DARK_SHEEN,
    boxShadow: [rim('rgba(255, 255, 255, 0.1)')],
  },
  focused: {
    // В фокусе тело заметно синее: #232C55 против #1A2447 в покое.
    backgroundImage:
      'linear-gradient(180deg, rgba(150, 170, 255, 0.12) 0%, ' +
      'rgba(150, 170, 255, 0.05) 100%)',
    boxShadow: [
      {
        offsetX: -6,
        offsetY: 0,
        blurRadius: 16,
        color: 'rgba(240, 210, 120, 0.18)',
      },
      {
        offsetX: 6,
        offsetY: 0,
        blurRadius: 16,
        color: 'rgba(110, 145, 240, 0.28)',
      },
    ],
  },
  focusBorder: [
    { offset: 0, color: '#F3DE8E' },
    { offset: 0.4, color: '#E2A6DC' },
    { offset: 0.65, color: '#A996EE' },
    { offset: 1, color: '#7F9BE6' },
  ],
};

// Светлая: тело сверху почти белое (#F1F5FE), книзу сливается с фоном,
// кант белый, под полем тень на 6–8 уровней темнее фона.
// Темнее прежнего белого блика (2026-10-05): поле сливалось с карточкой
// и фоном. Лёгкий голубовато-серый тон вместо белого.
const LIGHT_SHEEN =
  'linear-gradient(180deg, rgba(120, 135, 190, 0.05) 0%, ' +
  'rgba(120, 135, 190, 0.1) 100%)';

const LIGHT_DROP = {
  offsetX: 0,
  offsetY: 4,
  blurRadius: 12,
  color: 'rgba(120, 130, 180, 0.15)',
};

export const LIGHT_FIELD: FieldStyle = {
  rest: {
    backgroundImage: LIGHT_SHEEN,
    boxShadow: [rim('rgba(255, 255, 255, 0.9)'), LIGHT_DROP],
  },
  focused: {
    backgroundImage:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, ' +
      'rgba(255, 255, 255, 0.1) 100%)',
    boxShadow: [
      LIGHT_DROP,
      {
        offsetX: -6,
        offsetY: 0,
        blurRadius: 16,
        color: 'rgba(235, 200, 140, 0.18)',
      },
      {
        offsetX: 6,
        offsetY: 0,
        blurRadius: 16,
        color: 'rgba(150, 165, 230, 0.22)',
      },
    ],
  },
  focusBorder: [
    { offset: 0, color: '#EBCF95' },
    { offset: 0.35, color: '#E2B4C4' },
    { offset: 0.55, color: '#D7A9DE' },
    { offset: 0.8, color: '#A2A3DE' },
    { offset: 1, color: '#AFC6F0' },
  ],
};
