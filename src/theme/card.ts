/**
 * Оформление карточки — с референса «Content card» (решено 2026-10-02;
 * до того — «Tasks completed»). Содержимое и шрифты референса не
 * переносились, только форма: радиус, кант, блики, разделитель и плитка
 * картинки слева.
 *
 * Размеры пересчитаны от ширины карточки на референсе (570 px) к нашей
 * (около 358 точек): радиус 22 px → 14, плитка 70 px → 44 со скруглением
 * 10.
 *
 * - Тёмная: тело заметно светлее сверху (на референсе #1E2B55 → #152040),
 *   кант по краю ярче слева — там он голубоватый, едва заметная тень.
 * - Светлая: тело сверху почти белое, к низу сливается с фоном, кант
 *   белый, снизу мягкая голубовато-серая тень.
 *
 * Заливка — `colors.surface` (полупрозрачная); здесь только слои поверх
 * неё. Объектом стиля, а не в шаблоне: `backgroundImage` и `boxShadow`
 * styled-components не переводит (см. `shadows.ts`).
 */

import type { ViewStyle } from 'react-native';

import { rim } from './helpers';

export type CardStyle = {
  /** Слои карточки поверх `surface`. */
  readonly fill: ViewStyle;
  /** Плитка картинки слева: заливка под картинкой или заглушкой. */
  readonly media: ViewStyle;
  /** Линия между содержимым и нижней строкой карточки. */
  readonly divider: string;
};

export const DARK_CARD: CardStyle = {
  fill: {
    backgroundImage:
      'linear-gradient(180deg, rgba(130, 160, 255, 0.08) 0%, ' +
      'rgba(130, 160, 255, 0) 100%)',
    boxShadow: [
      rim('rgba(255, 255, 255, 0.1)'),
      // Левый край на референсе ярче и голубее остальных.
      {
        inset: true,
        offsetX: 2,
        offsetY: 0,
        blurRadius: 6,
        color: 'rgba(110, 140, 255, 0.16)',
      },
      {
        offsetX: 0,
        offsetY: 2,
        blurRadius: 6,
        color: 'rgba(0, 0, 0, 0.25)',
      },
    ],
  },
  // Плитка — фиолетовая с кантом, как на референсе.
  media: {
    backgroundImage: 'linear-gradient(135deg, #6A5480 0%, #45347E 100%)',
    boxShadow: [rim('rgba(255, 255, 255, 0.14)')],
  },
  // Как кант вторичной кнопки (`accent.ts`, `glass`) — решено 2026-10-02.
  divider: 'rgba(170, 190, 255, 0.3)',
};

export const LIGHT_CARD: CardStyle = {
  fill: {
    backgroundImage:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, ' +
      'rgba(255, 255, 255, 0) 100%)',
    boxShadow: [
      rim('rgba(255, 255, 255, 0.9)'),
      {
        offsetX: 0,
        offsetY: 8,
        blurRadius: 24,
        spreadDistance: -4,
        color: 'rgba(110, 125, 180, 0.22)',
      },
    ],
  },
  // Плитка — бледно-янтарная, как на референсе.
  media: {
    // Затемнено на ступень 2026-10-05.
    backgroundImage: 'linear-gradient(135deg, #FCE9C9 0%, #FADFB3 100%)',
    boxShadow: [rim('rgba(255, 255, 255, 0.8)')],
  },
  divider: 'rgba(110, 125, 180, 0.16)',
};
