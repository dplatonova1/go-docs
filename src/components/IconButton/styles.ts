import type { ViewStyle } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { MIN_TOUCH_TARGET, RADII } from '../../theme/metrics';
import {
  DISABLED_OPACITY,
  FILLED_ICON_BUTTON_SIZE,
  PRESSED_OPACITY,
} from './constants';
import type { ContainerStyleProps } from './types';

/** Иконка по центру тач-таргета: мелкую иконку легко промахнуть. */
export const Container = styled.Pressable<ContainerStyleProps>`
  min-width: ${({ $filled }) =>
    $filled ? FILLED_ICON_BUTTON_SIZE : MIN_TOUCH_TARGET}px;
  min-height: ${({ $filled }) =>
    $filled ? FILLED_ICON_BUTTON_SIZE : MIN_TOUCH_TARGET}px;
  justify-content: center;
  align-items: center;
  border-radius: ${({ $filled }) => ($filled ? RADII.pill : 0)}px;
  opacity: ${({ $disabled }) => ($disabled ? DISABLED_OPACITY : 1)};
`;

/** См. `Button/styles.ts`: Pressable отдаёт нажатие только колбэком. */
export const pressedStyle: ViewStyle = toStyleSheet(css`
  opacity: ${PRESSED_OPACITY};
`);
