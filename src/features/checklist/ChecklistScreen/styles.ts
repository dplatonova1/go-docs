import styled, { css, toStyleSheet } from 'styled-components/native';

import { FONTS, textSize } from '../../../theme/typography';

/** См. `CreateApplicationScreen/styles.ts`. */
export const listContentStyle = toStyleSheet(css`
  gap: 8px;
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

/** Под списком: отступ отделяет необратимое действие от пунктов. */
export const Footer = styled.View`
  gap: 12px;
  margin-top: 16px;
`;

/** Блок сборки пакета: отделён от списка и от удаления заявки. */
export const PackageBlock = styled.View`
  gap: 8px;
  margin-top: 16px;
`;

export const NoticeText = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const ErrorText = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.danger};
`;
