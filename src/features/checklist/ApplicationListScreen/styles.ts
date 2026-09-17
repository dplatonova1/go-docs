import styled, { css, toStyleSheet } from 'styled-components/native';

import { FONTS, textSize } from '../../../theme/typography';

/** См. `CreateApplicationScreen/styles.ts`. */
export const listContentStyle = toStyleSheet(css`
  gap: 8px;
  padding-bottom: 24px;
`);

export const Footer = styled.View`
  gap: 12px;
  margin-top: 16px;
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
