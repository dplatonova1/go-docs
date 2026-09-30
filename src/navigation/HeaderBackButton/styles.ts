import type { ViewStyle } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { MIN_TOUCH_TARGET } from '../../theme/metrics';

/**
 * Тач-таргет больше иконки: в шапке мелкую кнопку легко промахнуть.
 * Иконка прижата к левому краю, где стояла штатная стрелка.
 */
export const Container = styled.Pressable`
  min-width: ${MIN_TOUCH_TARGET}px;
  min-height: ${MIN_TOUCH_TARGET}px;
  justify-content: center;
  align-items: flex-start;
`;

export const pressedStyle: ViewStyle = toStyleSheet(css`
  opacity: 0.6;
`);
