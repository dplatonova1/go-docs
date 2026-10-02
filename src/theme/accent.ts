/**
 * Акцентные заливки — градиенты главных действий экрана.
 *
 * `sunset` снята пикселями с референсов (кнопка «End early», решено
 * 2026-09-30), своя для каждой темы:
 *
 * - тёмная — насыщенный градиент жёлтый → коралловый → розовый →
 *   фиолетовый с наклоном `142deg` (у верхнего края жёлтый уходит дальше
 *   вправо, чем у нижнего), светлый блик по краям, розовое свечение,
 *   белая надпись;
 * - светлая — те же оттенки пастелью: горизонтальный градиент персиковый
 *   → розовый → сиреневый, к верхнему краю белеет (на референсе сверху
 *   около 65% белого, снизу чистый цвет), малиновая надпись.
 *
 * Градиент рисуется самим React Native (`backgroundImage`, New
 * Architecture, обе платформы) — без нативной библиотеки. Задаётся
 * объектом стиля, а не в шаблоне styled-components: `css-to-react-native`
 * не знает этого свойства, как и `boxShadow` (см. `shadows.ts`).
 *
 * Контраст надписи к заливке ниже порога `colors.ts` (7:1) и принят
 * осознанно ради совпадения с референсом: в тёмной теме белый даёт от
 * 1.6:1 (жёлтый край) до 5.3:1 (фиолетовый), в светлой малиновый — от
 * 3.5:1 до 4.2:1; у `sky` белый — от 1.8:1 до 3.7:1 (градиент вкладок); у `rose` — около
 * 4:1 в светлой и 5.8–6.8:1 в тёмной. Поэтому цвет надписи живёт здесь, а не в палитре,
 * которую проверяет тест контраста.
 */

import type { BoxShadowValue, ViewStyle } from 'react-native';

import type { GradientStop } from './field';
import {
  DARK_TAB_GLOW,
  DARK_TAB_GRADIENT,
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
const DARK_GRADIENT =
  'linear-gradient(142deg, #FFC94C 0%, #FCC04D 10%, #F8B156 18%, ' +
  '#F1886C 34%, #E06B91 50%, #C55BB3 66%, #8D52D6 82%, #7952E2 90%, ' +
  '#6D50E8 100%)';

/** Блик по краям: верхний край на референсе светлее тела кнопки. */
const DARK_HIGHLIGHT =
  'linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, ' +
  'rgba(255, 255, 255, 0) 18%, rgba(255, 255, 255, 0) 86%, ' +
  'rgba(255, 255, 255, 0.12) 100%)';

/** Цвета — по нижней части референса, где белого слоя уже нет. */
const LIGHT_GRADIENT =
  'linear-gradient(90deg, #FFE4C6 0%, #FEDFCC 10%, #FCD7E0 25%, ' +
  '#F9D4ED 40%, #F8D2F1 55%, #F4CEF4 70%, #EAD2F9 85%, #DFDAFD 100%)';

/** Белый слой: доля белого снята по высоте кнопки на референсе. */
const LIGHT_WASH =
  'linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, ' +
  'rgba(255, 255, 255, 0.45) 30%, rgba(255, 255, 255, 0.25) 55%, ' +
  'rgba(255, 255, 255, 0) 85%)';

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

/**
 * Еле видный светлый внутренний бордер в 1 точку — внутренней тенью без
 * размытия, а не `borderWidth`: градиент рисуется только внутри рамки и
 * под ней повторяется с противоположного края (на левом краю проступал
 * фиолетовый, на правом жёлтый), а `backgroundOrigin` в React Native нет.
 */
function innerBorder(opacity: number, rgb = '255, 255, 255'): BoxShadowValue {
  return {
    inset: true,
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadDistance: 1,
    color: `rgba(${rgb}, ${opacity})`,
  };
}

// Первый слой `backgroundImage` рисуется сверху, как в CSS.

const DARK_SUNSET: AccentStyle = {
  fill: {
    backgroundImage: `${glare(0.45)}, ${DARK_HIGHLIGHT}, ${DARK_GRADIENT}`,
    boxShadow: [
      innerBorder(0.28),
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

const LIGHT_SUNSET: AccentStyle = {
  fill: {
    backgroundImage: `${glare(0.8)}, ${LIGHT_WASH}, ${LIGHT_GRADIENT}`,
    // На референсе тень едва заметна: фон под кнопкой чуть темнее и
    // розовее, чем над ней.
    boxShadow: [
      // На пастели белый заметен только при большей непрозрачности.
      innerBorder(0.7),
      ...bevel(0.9, 'rgba(170, 110, 200, 0.22)'),
      {
        offsetX: 0,
        offsetY: 6,
        blurRadius: 20,
        spreadDistance: -4,
        color: 'rgba(200, 120, 170, 0.18)',
      },
    ],
  },
  // Самые тёмные пиксели букв на референсе — #BC5A7D, и это ещё
  // сглаживание; цвет штриха чуть темнее.
  foreground: '#B24E76',
};

/**
 * Голубая заливка главных действий («Собрать пакет», «Сохранить»). С
 * 2026-10-02 градиент и свечение — те же, что у активной вкладки
 * (`tabs.ts`), поэтому свой для каждой темы. Прежде — синий градиент с
 * референса «Add task», один для обеих тем.
 */
function sky(gradient: string, glow: string): AccentStyle {
  return {
    fill: {
      backgroundImage: `${glare(0.4)}, ${gradient}`,
      boxShadow: [
        innerBorder(0.3),
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
    foreground: '#FFFFFF',
  };
}

const DARK_SKY = sky(DARK_TAB_GRADIENT, DARK_TAB_GLOW);
const LIGHT_SKY = sky(LIGHT_TAB_GRADIENT, LIGHT_TAB_GLOW);

/**
 * Кнопки удаления — с референса «Log out», своя для каждой темы.
 *
 * Светлая: пастельно-розовая, слева чуть светлее (#FBE7E8 → #F9DCE7),
 * блик в левом верхнем углу, малиновая надпись.
 */
const LIGHT_ROSE: AccentStyle = {
  fill: {
    backgroundImage:
      `${glare(0.7)}, ` +
      'linear-gradient(90deg, #FCEAEB 0%, #FAE3E7 35%, #F9DDE7 70%, ' +
      '#F9DDE8 100%)',
    boxShadow: [
      innerBorder(0.7),
      ...bevel(0.8, 'rgba(200, 120, 150, 0.15)'),
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 14,
        spreadDistance: -4,
        color: 'rgba(200, 120, 160, 0.15)',
      },
    ],
  },
  // Самые тёмные пиксели букв — #AA5F7C, со сглаживанием.
  foreground: '#A55876',
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
      innerBorder(0.18, '255, 170, 220'),
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
      innerBorder(0.3, '170, 190, 255'),
      ...bevel(0.12, 'rgba(0, 0, 0, 0.2)'),
    ],
  },
  foreground: '#E6EAF8',
};

/**
 * Светлая: почти белая полупрозрачная пилюля, белый кант, мягкая тень,
 * тёмно-синевато-серая надпись.
 */
const LIGHT_GLASS: AccentStyle = {
  fill: {
    backgroundImage:
      `${glare(0.5)}, ` +
      'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, ' +
      'rgba(255, 255, 255, 0.55) 100%)',
    boxShadow: [
      innerBorder(0.95),
      {
        offsetX: 0,
        offsetY: 6,
        blurRadius: 16,
        spreadDistance: -4,
        color: 'rgba(120, 130, 180, 0.18)',
      },
    ],
  },
  foreground: '#4B5278',
};

/**
 * Цвета лоадера (`GradientSpinner`) — градиент «Создать заявку». В обеих
 * темах насыщенный вариант тёмной темы: пастель светлой кнопки на светлом
 * фоне почти не видна, а лоадер должен быть заметен.
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
  sunset: LIGHT_SUNSET,
  sky: LIGHT_SKY,
  rose: LIGHT_ROSE,
  glass: LIGHT_GLASS,
};
