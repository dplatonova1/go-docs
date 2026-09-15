import styled from 'styled-components/native';

import { FONTS, textSize } from '../../theme/typography';

export const Centered = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const Title = styled.Text`
  ${textSize(20)}
  font-family: ${FONTS.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

export const Message = styled.Text`
  ${textSize(16)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.text};
`;
