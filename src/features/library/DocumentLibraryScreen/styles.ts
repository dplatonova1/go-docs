import styled, { css, toStyleSheet } from 'styled-components/native';

import { CARD_LIST_GAP } from '../../../theme/metrics';
import { FONTS, textSize } from '../../../theme/typography';

/** См. `checklist/ChecklistScreen/styles.ts`. */
export const listContentStyle = toStyleSheet(css`
  gap: ${CARD_LIST_GAP}px;
`);

export const Header = styled.View`
  gap: 4px;
  margin-bottom: 8px;
`;

export const Summary = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
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
