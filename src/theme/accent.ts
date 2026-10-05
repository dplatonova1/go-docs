/**
 * Акцентные заливки — градиенты главных действий экрана.
 *
 * `sunset` снята пикселями с референса тёмной темы (кнопка «End early»,
 * решено 2026-09-30): насыщенный градиент жёлтый → коралловый → розовый
 * → фиолетовый с наклоном `142deg` (у верхнего края жёлтый уходит
 * дальше вправо, чем у нижнего), светлый блик по краям, розовое
 * свечение, белая надпись. С 2026-10-05 одна и та же в обеих темах:
 * пастельный вариант светлой темы терялся на светлом фоне.
 *
 * Градиент рисуется самим React Native (`backgroundImage`, New
 * Architecture, обе платформы) — без нативной библиотеки. Задаётся
 * объектом стиля, а не в шаблоне styled-components: `css-to-react-native`
 * не знает этого свойства, как и `boxShadow` (см. `shadows.ts`).
 *
 * Контраст надписи к заливке (решено 2026-10-05): не ниже 4.5:1 (WCAG
 * AA) на всей длине градиента. Порог палитры `colors.ts` (7:1) для
 * градиентов не достигается без потери цвета, поэтому цвета надписей
 * живут здесь, а 4.5:1 проверяет `theme/__tests__/accent.test.ts` —
 * кроме явных исключений, записанных там с причиной.
 */

import type { BoxShadowValue, ViewStyle } from 'react-native';

import type { GradientStop } from './field';
import { rim } from './helpers';
import {
  DARK_TAB_GLOW,
  DARK_TAB_GRADIENT,
  LIGHT_TAB_BORDER,
  LIGHT_TAB_FOREGROUND,
  LIGHT_TAB_GLOW,
  LIGHT_TAB_GRADIENT,
} from './tabs';

/**
 * Заливки главных действий:
 * - `sunset` — тёплый градиент, «Создать заявку»;
 * - `sky` — голубой, как активная вкладка: «Собрать пакет», «Сохранить»;
 * - `rose` — приглушённый розовый, кнопки удаления (`Button`, вариант
 *   `danger`);
 * - `glass` — полупрозрачное «стекло», вторичные кнопки (`Button`,
 *   вариант `secondary`).
 */
export type AccentName = 'sunset' | 'sky' | 'rose' | 'glass';

export type AccentStyle = {
  /** Заливка: градиент и свечение. */
  readonly fill: ViewStyle;
  /** Надпись и иконка на заливке. */
  readonly foreground: string;
};

export type Accents = Readonly<Record<AccentName, AccentStyle>>;

/**
 * Опорные цвета — средние по столбцам референса без пикселей надписи;
 * крайние (0% и 100%) продолжены за пределы снятого.
 */
// С референса, с жёлтым началом. Затемнённый вариант (оранжевый →
// малиновый → фиолетовый, белый 4.5:1) пробовали 2026-10-05 и откатили
// в тот же день: без жёлтого кнопка потеряла вид референса. Белый на
// жёлтом начале — 1.6:1, принято осознанно, исключение в
// `accent.test.ts`.
const DARK_GRADIENT =
  'linear-gradient(142deg, #FFC94C 0%, #FCC04D 10%, #F8B156 18%, ' +
  '#F1886C 34%, #E06B91 50%, #C55BB3 66%, #8D52D6 82%, #7952E2 90%, ' +
  '#6D50E8 100%)';

/** Блик по краям: верхний край на референсе светлее тела кнопки. */
const DARK_HIGHLIGHT =
  'linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, ' +
  'rgba(255, 255, 255, 0) 18%, rgba(255, 255, 255, 0) 86%, ' +
  'rgba(255, 255, 255, 0.12) 100%)';

/**
 * Блик в левом верхнем углу — мягкое пятно света, как на референсах:
 * вместе с внутренними тенями (`bevel`) даёт кнопке выпуклость. В тёмной
 * теме слабее, чтобы не выбелить насыщенный жёлтый.
 */
function glare(opacity: number): string {
  return (
    'radial-gradient(ellipse 32% 80% at 9% 14%, ' +
    `rgba(255, 255, 255, ${opacity}) 0%, ` +
    `rgba(255, 255, 255, ${opacity * 0.35}) 45%, ` +
    'rgba(255, 255, 255, 0) 100%)'
  );
}

/**
 * Объём внутренними тенями: светлый кант по верхнему и левому краю
 * (свет сверху слева) и затенение по нижнему и правому.
 */
function bevel(light: number, shade: string): BoxShadowValue[] {
  return [
    {
      inset: true,
      offsetX: 2,
      offsetY: 3,
      blurRadius: 6,
      color: `rgba(255, 255, 255, ${light})`,
    },
    {
      inset: true,
      offsetX: -3,
      offsetY: -5,
      blurRadius: 12,
      color: shade,
    },
  ];
}

// Первый слой `backgroundImage` рисуется сверху, как в CSS.

const DARK_SUNSET: AccentStyle = {
  fill: {
    backgroundImage: `${glare(0.45)}, ${DARK_HIGHLIGHT}, ${DARK_GRADIENT}`,
    boxShadow: [
      rim('rgba(255, 255, 255, 0.28)'),
      ...bevel(0.45, 'rgba(60, 20, 110, 0.35)'),
      {
        offsetX: 0,
        offsetY: 8,
        blurRadius: 24,
        spreadDistance: -4,
        color: 'rgba(224, 107, 145, 0.35)',
      },
    ],
  },
  foreground: '#FFFFFF',
};

/**
 * Голубая заливка главных действий («Собрать пакет», «Сохранить»). С
 * 2026-10-02 градиент и свечение — те же, что у активной вкладки
 * (`tabs.ts`), поэтому свой для каждой темы. Прежде — синий градиент с
 * референса «Add task», один для обеих тем.
 */
function sky(
  gradient: string,
  glow: string,
  foreground: string,
  border: string,
): AccentStyle {
  return {
    fill: {
      backgroundImage: `${glare(0.4)}, ${gradient}`,
      boxShadow: [
        rim(border),
        ...bevel(0.4, 'rgba(60, 50, 170, 0.3)'),
        {
          offsetX: 0,
          offsetY: 8,
          blurRadius: 20,
          spreadDistance: -4,
          color: glow,
        },
      ],
    },
    foreground,
  };
}

const DARK_SKY = sky(
  DARK_TAB_GRADIENT,
  DARK_TAB_GLOW,
  '#FFFFFF',
  'rgba(255, 255, 255, 0.3)',
);
// Светлая — пастель вкладок с тёмной надписью и тёмной рамкой
// (решено 2026-10-05).
const LIGHT_SKY = sky(
  LIGHT_TAB_GRADIENT,
  LIGHT_TAB_GLOW,
  LIGHT_TAB_FOREGROUND,
  LIGHT_TAB_BORDER,
);

/**
 * Кнопки удаления. Тёмная — с референса «Log out»; светлая — с референса
 * «Delete» (решено 2026-10-05): розово-сиреневая заливка, сверху чуть
 * сиреневее (#F7D8F2 → #FDD3E8), розовый кант и блик слева, красная
 * надпись. Красный на референсе (#F80B23) даёт на заливке 3.1:1 —
 * взят тот же оттенок глубже, #C50619, 4.6:1.
 */
const LIGHT_ROSE: AccentStyle = {
  fill: {
    backgroundImage:
      `${glare(0.7)}, ` +
      'linear-gradient(180deg, #F7D8F2 0%, #FBD5EB 50%, #FDD3E8 100%)',
    boxShadow: [
      // Однотонный розовый кант, как на левом краю референса (#FCD2E2):
      // темнее заливки, а не светлее (решено 2026-10-05). Полупрозрачный —
      // одинаково ложится на всю заливку, на ней около #F7BFDA.
      rim('rgba(230, 90, 140, 0.18)'),
      ...bevel(0.8, 'rgba(220, 120, 170, 0.15)'),
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 14,
        spreadDistance: -4,
        color: 'rgba(220, 120, 170, 0.15)',
      },
    ],
  },
  foreground: '#C50619',
};

/**
 * Тёмная: сливовая (#352F45 → #3D2A42 → #2D273D), сверху ближе к центру
 * розовое свечение, по краю розоватый кант, розовая надпись.
 */
const DARK_ROSE: AccentStyle = {
  fill: {
    backgroundImage:
      `${glare(0.12)}, ` +
      'radial-gradient(ellipse 45% 90% at 42% 10%, ' +
      'rgba(170, 80, 130, 0.3) 0%, rgba(170, 80, 130, 0) 100%), ' +
      'linear-gradient(90deg, #352F45 0%, #3D2A42 45%, #2D273D 100%)',
    boxShadow: [
      rim('rgba(255, 170, 220, 0.18)'),
      ...bevel(0.08, 'rgba(0, 0, 0, 0.3)'),
    ],
  },
  foreground: '#EFA6CC',
};

/**
 * Вторичные кнопки — с референса «Secondary button» (решено 2026-10-02).
 * Файл референса не сохранился, цвета подобраны по изображению на глаз, а
 * не сняты пикселями.
 *
 * Тёмная: полупрозрачная синеватая заливка, сверху светлее, голубоватый
 * кант, у нижнего края по центру светящаяся полоса, почти белая надпись.
 * Заливка прозрачная насквозь — кнопка стоит и на фоне экрана, и в
 * карточке.
 */
const DARK_GLASS: AccentStyle = {
  fill: {
    backgroundImage:
      'radial-gradient(ellipse 45% 35% at 50% 100%, ' +
      'rgba(140, 170, 255, 0.35) 0%, rgba(140, 170, 255, 0) 100%), ' +
      'linear-gradient(180deg, rgba(120, 150, 255, 0.16) 0%, ' +
      'rgba(120, 150, 255, 0.06) 100%)',
    boxShadow: [
      rim('rgba(170, 190, 255, 0.3)'),
      ...bevel(0.12, 'rgba(0, 0, 0, 0.2)'),
    ],
  },
  foreground: '#E6EAF8',
};

/**
 * Светлая: почти белая полупрозрачная пилюля, белый кант, мягкая тень,
 * тёмно-синевато-серая надпись.
 */
const LIGHT_GLASS_FOREGROUND = '#4B5278';

const LIGHT_GLASS: AccentStyle = {
  fill: {
    backgroundImage:
      `${glare(0.5)}, ` +
      'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, ' +
      'rgba(255, 255, 255, 0.55) 100%)',
    boxShadow: [
      // Рамка в цвет надписи (решено 2026-10-05): полупрозрачно-белая
      // кнопка без неё сливалась с фоном и карточками. Плотность 28% —
      // как у рамки плашки «Прикреплено» (`colors.attachedBorder`).
      rim('rgba(75, 82, 120, 0.28)'),
      {
        offsetX: 0,
        offsetY: 6,
        blurRadius: 16,
        spreadDistance: -4,
        color: 'rgba(120, 130, 180, 0.18)',
      },
    ],
  },
  foreground: LIGHT_GLASS_FOREGROUND,
};

/**
 * Цвета лоадера (`GradientSpinner`) — градиент «Создать заявку», один
 * для обеих тем, как и сама кнопка.
 */
export const SPINNER_STOPS: readonly GradientStop[] = [
  { offset: 0, color: '#FFC94C' },
  { offset: 0.3, color: '#F1886C' },
  { offset: 0.55, color: '#E06B91' },
  { offset: 0.8, color: '#C55BB3' },
  { offset: 1, color: '#6D50E8' },
];

export const DARK_ACCENTS: Accents = {
  sunset: DARK_SUNSET,
  sky: DARK_SKY,
  rose: DARK_ROSE,
  glass: DARK_GLASS,
};

export const LIGHT_ACCENTS: Accents = {
  // Та же кнопка, что в тёмной теме (решено 2026-10-05): пастельный
  // вариант терялся на светлом фоне.
  sunset: DARK_SUNSET,
  sky: LIGHT_SKY,
  rose: LIGHT_ROSE,
  glass: LIGHT_GLASS,
};
