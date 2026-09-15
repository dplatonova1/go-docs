import styled, { css, toStyleSheet } from 'styled-components/native';

import { FONTS, textSize } from '../../../theme/typography';

/**
 * Отступы списка — через `contentContainerStyle`, чтобы прокручивались
 * вместе с содержимым (см. `components/Screen/styles.ts`).
 */
export const listContentStyle = toStyleSheet(css`
  gap: 12px;
  padding-bottom: 24px;
`);

export const Header = styled.View`
  gap: 12px;
`;

export const Footer = styled.View`
  gap: 12px;
`;

export const Heading = styled.Text`
  ${textSize(24)}
  font-family: ${FONTS.bold};
  color: ${({ theme }) => theme.colors.text};
`;

export const SectionTitle = styled.Text`
  ${textSize(18)}
  font-family: ${FONTS.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin-top: 8px;
`;

export const Hint = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const FormError = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.danger};
`;
