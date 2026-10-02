import type { ViewStyle } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { LARGE_BUTTON_HEIGHT, RADII } from '../../theme/metrics';
import { FONTS, textSize } from '../../theme/typography';
import { DISABLED_OPACITY, PRESSED_OPACITY } from './constants';
import type { ContainerStyleProps, LabelStyleProps } from './types';

/**
 * Пилюля на всю ширину родителя; иконка и надпись по центру. Заливка —
 * `theme.accents[accent].fill`: градиент задаётся только объектом стиля, поэтому
 * его подставляет компонент.
 */
export const Container = styled.Pressable<ContainerStyleProps>`
  min-height: ${LARGE_BUTTON_HEIGHT}px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  border-radius: ${RADII.pill}px;
  opacity: ${({ $disabled }) => ($disabled ? DISABLED_OPACITY : 1)};
`;

/** См. `Button/styles.ts`: Pressable отдаёт нажатие только колбэком. */
export const pressedStyle: ViewStyle = toStyleSheet(css`
  opacity: ${PRESSED_OPACITY};
`);

export const Label = styled.Text<LabelStyleProps>`
  ${textSize(17)}
  font-family: ${FONTS.semibold};
  color: ${({ theme, $accent }) => theme.accents[$accent].foreground};
`;
