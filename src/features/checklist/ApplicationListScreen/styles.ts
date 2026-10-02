import styled, { css, toStyleSheet } from 'styled-components/native';

import { CARD_LIST_GAP, LIST_END_PADDING } from '../../../theme/metrics';
import { FONTS, textSize } from '../../../theme/typography';
import { CREATE_BUTTON_GAP } from './constants';

/** См. `CreateApplicationScreen/styles.ts`. */
export const listContentStyle = toStyleSheet(css`
  gap: ${CARD_LIST_GAP}px;
  padding-bottom: ${LIST_END_PADDING}px;
`);

/**
 * Под списком, во всю ширину: список сжимается над кнопкой, а не уходит под
 * неё, поэтому последняя строка всегда видна целиком.
 */
export const CreateButtonSlot = styled.View`
  align-items: stretch;
  padding-top: ${CREATE_BUTTON_GAP}px;
  /* Не вплотную к нижней панели — как конец прокрутки списков. */
  padding-bottom: ${LIST_END_PADDING}px;
`;

export const Hint = styled.Text`
  ${textSize(15)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const ErrorText = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.danger};
`;
