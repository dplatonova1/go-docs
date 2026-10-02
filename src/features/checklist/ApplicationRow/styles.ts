import type { ViewStyle } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { MIN_TOUCH_TARGET } from '../../../theme/metrics';
import { FONTS, textSize } from '../../../theme/typography';

/**
 * Открытие заявки — вся область с названием, а не отдельная кнопка.
 * Справа по центру стрелка, как на референсе карточки (2026-10-02).
 */
export const OpenArea = styled.Pressable`
  min-height: ${MIN_TOUCH_TARGET}px;
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

/** См. `components/Button/styles.ts`: Pressable отдаёт нажатие колбэком. */
export const pressedStyle: ViewStyle = toStyleSheet(css`
  opacity: 0.7;
`);

export const Title = styled.Text`
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: 0;
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
