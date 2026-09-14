/**
 * Тени из темы.
 *
 * Задаются свойством `boxShadow` React Native (New Architecture, обе
 * платформы), а не CSS `box-shadow` в шаблоне styled-components:
 * `css-to-react-native` его не переводит — со spread падает с ошибкой, без
 * spread даёт iOS-свойства `shadow*`, и на Android тени нет. Поэтому это
 * готовые объекты стиля, которые подставляются в `style`
 * (см. `components/Button`).
 *
 * В светлой и тёмной теме тени одинаковые, как и в исходной теме. Дубли
 * исходной темы не перенесены: `2xs` = `xs`, `shadow` = `sm`.
 */

import type { ViewStyle } from 'react-native';

type ShadowLayer = [
  offsetY: number,
  blurRadius: number,
  spreadDistance: number,
  opacity: number,
];

function shadow(...layers: ShadowLayer[]): ViewStyle {
  return {
    boxShadow: layers.map(([offsetY, blurRadius, spreadDistance, opacity]) => ({
      offsetX: 0,
      offsetY,
      blurRadius,
      spreadDistance,
      color: `rgba(0, 0, 0, ${opacity})`,
    })),
  };
}

export const SHADOWS = {
  xs: shadow([1, 3, 0, 0.09]),
  sm: shadow([1, 3, 0, 0.17], [1, 2, -1, 0.17]),
  md: shadow([1, 3, 0, 0.17], [2, 4, -1, 0.17]),
  lg: shadow([1, 3, 0, 0.17], [4, 6, -1, 0.17]),
  xl: shadow([1, 3, 0, 0.17], [8, 10, -1, 0.17]),
  xxl: shadow([1, 3, 0, 0.43]),
} as const;
