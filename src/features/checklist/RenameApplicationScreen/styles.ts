import styled from 'styled-components/native';

import { FONTS, textSize } from '../../../theme/typography';

export const Hint = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/**
 * «Отмена» и «Сохранить» в ряд (решено 2026-10-02). При крупном
 * системном шрифте переносятся в столбик, а не сжимаются до многоточия.
 */
export const Actions = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`;

/** Кнопки делят ширину поровну; на узком экране — каждая на свою строку. */
export const ActionSlot = styled.View`
  flex-grow: 1;
  flex-basis: 40%;
`;

export const FormError = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.danger};
`;
