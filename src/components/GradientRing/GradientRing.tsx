/**
 * Градиентная рамка поверх элемента: поле ввода в фокусе, выбранный
 * вариант в настройках. Цвета — `theme.field.focusBorder`, с референса
 * (см. `theme/field.ts`).
 *
 * Рисуется SVG, а не `borderColor`: у рамки React Native градиента нет.
 * SVG нужен размер в точках, поэтому рамка меряет слой, растянутый на
 * весь родитель, — родитель ничего ей не передаёт.
 *
 * Декоративная: скринридер её не видит, касания проходят насквозь.
 */

import { useCallback, useId, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import { GRADIENT_RING_WIDTH } from './constants';
import { Overlay } from './styles';
import type { GradientRingProps, RingSize } from './types';

export function GradientRing({ radius }: GradientRingProps) {
  const theme = useTheme();
  const [size, setSize] = useState<RingSize | null>(null);
  // `useId` даёт `:r1:` — двоеточия в `url(#…)` SVG не годятся.
  const gradientId = `gradient-ring-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Холст растянут на весь слой (100%), а координаты рамки заданы в точках
  // замера через `viewBox`. Замер (`onLayout`) дробный, а слой на экране
  // выровнен по пиксельной сетке и бывает на пиксель короче: холст с
  // размером из замера выходил за слой, и нижняя кромка срезалась. Так
  // холст всегда совпадает со слоем, и рамка лежит вплотную к краю. Запас
  // от края, которым это лечилось прежде, давал в светлой теме светлую
  // полоску между рамкой и краем (2026-10-05).
  const inset = GRADIENT_RING_WIDTH / 2;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  return (
    <Overlay
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={handleLayout}
    >
      {size === null ? null : (
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.width} ${size.height}`}
          // Разница со слоем — доли пикселя, растяжение на неё незаметно.
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              {theme.field.focusBorder.map(stop => (
                <Stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                />
              ))}
            </LinearGradient>
          </Defs>
          {/* Обводка ложится по середине линии контура — сдвиг на
              половину толщины держит её целиком внутри элемента. */}
          <Rect
            x={inset}
            y={inset}
            width={size.width - inset * 2}
            height={size.height - inset * 2}
            rx={radius - inset}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={GRADIENT_RING_WIDTH}
          />
        </Svg>
      )}
    </Overlay>
  );
}
