import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { MIN_TOUCH_TARGET, RADII } from '../../../theme/metrics';
import { FONTS, textSize } from '../../../theme/typography';

export const Card = styled.View`
  gap: 8px;
  padding: 12px;
  border-radius: ${RADII.lg}px;
  border-width: ${StyleSheet.hairlineWidth}px;
  border-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.surface};
`;

/** Открытие заявки — вся область с названием, а не отдельная кнопка. */
export const OpenArea = styled.Pressable`
  min-height: ${MIN_TOUCH_TARGET}px;
  justify-content: center;
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

/**
 * Кнопки в строку. При крупном системном шрифте переносятся, а не
 * сжимаются до многоточия.
 */
export const Actions = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

/** Кнопки делят ширину поровну и не схлопываются при длинной подписи. */
export const actionStyle: ViewStyle = toStyleSheet(css`
  flex-grow: 1;
  flex-basis: 40%;
`);
