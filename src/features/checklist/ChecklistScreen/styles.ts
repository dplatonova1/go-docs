import styled, { css, toStyleSheet } from 'styled-components/native';

import { FONTS, textSize } from '../../../theme/typography';

/** См. `CreateApplicationScreen/styles.ts`. */
export const listContentStyle = toStyleSheet(css`
  gap: 8px;
  padding-bottom: 24px;
`);

export const Header = styled.View`
  gap: 4px;
  margin-bottom: 8px;
`;

export const Heading = styled.Text`
  ${textSize(24)}
  font-family: ${FONTS.bold};
  color: ${({ theme }) => theme.colors.text};
`;

export const Summary = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/** Под списком: отступ отделяет необратимое действие от пунктов. */
export const Footer = styled.View`
  gap: 12px;
  margin-top: 16px;
`;

export const ErrorText = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.danger};
`;
