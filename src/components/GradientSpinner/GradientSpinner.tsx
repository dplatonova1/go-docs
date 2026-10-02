/**
 * Лоадер экрана — вращающаяся дуга с градиентом «Создать заявку»
 * (`theme.spinner`, решено 2026-10-02). Заменяет системный
 * `ActivityIndicator`: тот умеет только один цвет.
 *
 * Дуга рисуется `react-native-svg`, вращается `Animated` с нативным
 * драйвером — кадры считает нативная сторона, и лоадер не замирает, пока
 * JS занят загрузкой. «Уменьшение движения» вращение не отключает:
 * без него не видно, что работа идёт, и системный лоадер тоже крутится.
 *
 * Для скринридера — как системный: роль `progressbar` и подпись.
 */

import { useEffect, useId, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

import {
  SPINNER_ARC_FRACTION,
  SPINNER_SIZE,
  SPINNER_STROKE_WIDTH,
  SPINNER_TURN_MS,
} from './constants';
import { Holder, Rotor } from './styles';
import type { GradientSpinnerProps } from './types';

export function GradientSpinner({
  accessibilityLabel,
  testID,
  fill = false,
}: GradientSpinnerProps) {
  const theme = useTheme();
  const turn = useRef(new Animated.Value(0)).current;
  // `useId` даёт `:r1:` — двоеточия в `url(#…)` SVG не годятся.
  const gradientId = `spinner-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: SPINNER_TURN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);

  const radius = (SPINNER_SIZE - SPINNER_STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * SPINNER_ARC_FRACTION;
  const rotate = turn.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Holder $fill={fill}>
      <Rotor
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={{ transform: [{ rotate }] }}
      >
        <Svg width={SPINNER_SIZE} height={SPINNER_SIZE}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              {theme.spinner.map(stop => (
                <Stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Circle
            cx={SPINNER_SIZE / 2}
            cy={SPINNER_SIZE / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={SPINNER_STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
        </Svg>
      </Rotor>
    </Holder>
  );
}
