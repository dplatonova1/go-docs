import type { ViewStyle } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import {
  DISABLED_OPACITY,
  PLUS_BUTTON_SIZE,
  PRESSED_OPACITY,
} from './constants';
import type { ContainerStyleProps } from './types';

/** Кнопка — сама иконка `add` (плюс в круге), без своей заливки. */
export const Container = styled.Pressable<ContainerStyleProps>`
  width: ${PLUS_BUTTON_SIZE}px;
  height: ${PLUS_BUTTON_SIZE}px;
  justify-content: center;
  align-items: center;
  opacity: ${({ $disabled }) => ($disabled ? DISABLED_OPACITY : 1)};
`;

/** См. `Button/styles.ts`: Pressable отдаёт нажатие только колбэком. */
export const pressedStyle: ViewStyle = toStyleSheet(css`
  opacity: ${PRESSED_OPACITY};
`);
