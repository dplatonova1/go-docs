import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { MIN_TOUCH_TARGET, RADII } from '../../../theme/metrics';
import { FONTS, textSize } from '../../../theme/typography';

export const Container = styled.Pressable`
  min-height: ${MIN_TOUCH_TARGET}px;
  justify-content: center;
  gap: 4px;
  padding: 12px;
  border-radius: ${RADII.lg}px;
  border-width: ${StyleSheet.hairlineWidth}px;
  border-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.surface};
`;

/** См. `components/Button/styles.ts`: Pressable отдаёт нажатие колбэком. */
export const pressedStyle: ViewStyle = toStyleSheet(css`
  opacity: 0.7;
`);

export const Title = styled.Text`
  ${textSize(17)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.text};
`;
