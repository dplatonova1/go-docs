import type { ViewStyle } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { MIN_TOUCH_TARGET, RADII } from '../../theme/metrics';
import { DISABLED_OPACITY, PRESSED_OPACITY } from './constants';
import type { ContainerStyleProps } from './types';

/** Иконка по центру тач-таргета: мелкую иконку легко промахнуть. */
export const Container = styled.Pressable<ContainerStyleProps>`
  min-width: ${MIN_TOUCH_TARGET}px;
  min-height: ${MIN_TOUCH_TARGET}px;
  justify-content: center;
  align-items: center;
  border-radius: ${({ $filled }) => ($filled ? RADII.pill : 0)}px;
  opacity: ${({ $disabled }) => ($disabled ? DISABLED_OPACITY : 1)};
`;

/** См. `Button/styles.ts`: Pressable отдаёт нажатие только колбэком. */
export const pressedStyle: ViewStyle = toStyleSheet(css`
  opacity: ${PRESSED_OPACITY};
`);
