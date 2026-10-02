import styled from 'styled-components/native';

import { FONTS, textSize } from '../../../theme/typography';

/** Картинка на всю плитку карточки — скругление даёт плитка. */
export const Preview = styled.Image`
  width: 100%;
  height: 100%;
`;

/**
 * Подпись вместо картинки. Плитка маленькая (44 точки), поэтому текст
 * мелкий и сжимается, чтобы «Файл недоступен» поместился целиком.
 */
export const PlaceholderText = styled.Text`
  ${textSize(9)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  padding: 2px;
`;
