/**
 * Пилюля активной вкладки — одна на всю панель, при переключении
 * переезжает к новой вкладке и на ходу «перетекает»: чуть растягивается
 * по горизонтали и приплющивается, потом возвращается к форме (решено
 * 2026-10-02).
 *
 * Анимация — встроенный `Animated` с нативным драйвером: двигаются
 * только `transform`, поэтому кадры считает нативная сторона, а не JS.
 * Reanimated не подключали: новая нативная зависимость ради одного
 * перехода — это ещё и проверка манифеста по ADR-0009.
 *
 * Размер пилюли берётся из раскладки: ширина ячейки — из ряда вкладок,
 * высота — из содержимого вкладки (оно растёт с системным шрифтом). Пока
 * размеры неизвестны, пилюля не рисуется.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent } from 'react-native';

import {
  PILL_INSET,
  PILL_SPRING,
  PILL_STRETCH_IN_MS,
  PILL_STRETCH_OUT_MS,
  PILL_STRETCH_X,
  PILL_SQUASH_Y,
} from './constants';
import { useReduceMotion } from './useReduceMotion';

/**
 * @returns обработчики раскладки для ряда вкладок и содержимого вкладки,
 *   и стиль пилюли — `null`, пока раскладка неизвестна.
 */
export function usePillIndicator(activeIndex: number, tabCount: number) {
  const reduceMotion = useReduceMotion();
  const [rowWidth, setRowWidth] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);

  // Положение пилюли в индексах вкладок: 1.5 — посередине между второй и
  // третьей. Переводится в точки ниже, когда известна ширина ячейки.
  const position = useRef(new Animated.Value(activeIndex)).current;
  // 0 — пилюля в покое, 1 — растянута сильнее всего (середина пути).
  const stretch = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      position.setValue(activeIndex);
      stretch.setValue(0);
      return undefined;
    }

    const animation = Animated.parallel([
      Animated.spring(position, {
        toValue: activeIndex,
        useNativeDriver: true,
        ...PILL_SPRING,
      }),
      Animated.sequence([
        Animated.timing(stretch, {
          toValue: 1,
          duration: PILL_STRETCH_IN_MS,
          useNativeDriver: true,
        }),
        Animated.timing(stretch, {
          toValue: 0,
          duration: PILL_STRETCH_OUT_MS,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.start();

    // Переключили ещё раз, не дождавшись конца: новая анимация
    // продолжает с текущего места, а не со старой точки.
    return () => animation.stop();
  }, [activeIndex, reduceMotion, position, stretch]);

  const onRowLayout = useCallback((event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  }, []);

  const onBodyLayout = useCallback((event: LayoutChangeEvent) => {
    setBodyHeight(event.nativeEvent.layout.height);
  }, []);

  const cellWidth = tabCount > 0 ? rowWidth / tabCount : 0;

  const style = useMemo(() => {
    if (cellWidth <= 0 || bodyHeight <= 0) {
      return null;
    }

    const lastIndex = Math.max(tabCount - 1, 1);
    return {
      left: PILL_INSET,
      width: cellWidth - PILL_INSET * 2,
      height: bodyHeight,
      transform: [
        {
          translateX: position.interpolate({
            inputRange: [0, lastIndex],
            outputRange: [0, lastIndex * cellWidth],
          }),
        },
        {
          scaleX: stretch.interpolate({
            inputRange: [0, 1],
            outputRange: [1, PILL_STRETCH_X],
          }),
        },
        {
          scaleY: stretch.interpolate({
            inputRange: [0, 1],
            outputRange: [1, PILL_SQUASH_Y],
          }),
        },
      ],
    };
  }, [cellWidth, bodyHeight, tabCount, position, stretch]);

  return { onRowLayout, onBodyLayout, style };
}
