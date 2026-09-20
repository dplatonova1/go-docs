import styled from 'styled-components/native';

import { FONTS, textSize } from '../../../theme/typography';

export const Hint = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const Actions = styled.View`
  gap: 12px;
  margin-top: 8px;
`;

export const FormError = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.danger};
`;
