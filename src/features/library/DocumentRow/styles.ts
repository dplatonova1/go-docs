import type { ViewStyle } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { FONTS, textSize } from '../../../theme/typography';

export const Info = styled.View`
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  gap: 2px;
`;

export const Name = styled.Text`
  ${textSize(16)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.text};
`;

export const Meta = styled.Text`
  ${textSize(13)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/** Пометка детектора качества — как в пункте чек-листа. */
export const QualityNote = styled.Text`
  ${textSize(13)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.danger};
`;

export const Actions = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

/** Кнопка занимает строку целиком, а при двух — половину. */
export const actionStyle: ViewStyle = toStyleSheet(css`
  flex-grow: 1;
  flex-basis: 40%;
`);
