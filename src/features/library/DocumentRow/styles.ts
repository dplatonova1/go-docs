import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { RADII } from '../../../theme/metrics';
import { FONTS, textSize } from '../../../theme/typography';

/** Сторона квадрата превью. Размер один на все строки — список ровный. */
const PREVIEW_SIZE = 56;

export const Card = styled.View`
  gap: 8px;
  padding: 12px;
  border-radius: ${RADII.lg}px;
  border-width: ${StyleSheet.hairlineWidth}px;
  border-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.surface};
`;

/** Превью слева, текст справа; при крупном шрифте текст переносится. */
export const Header = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

export const Preview = styled.Image`
  width: ${PREVIEW_SIZE}px;
  height: ${PREVIEW_SIZE}px;
  border-radius: ${RADII.sm}px;
  background-color: ${({ theme }) => theme.colors.background};
`;

/** Место превью, когда картинки нет: та же клетка, чтобы список не прыгал. */
export const PreviewPlaceholder = styled.View`
  width: ${PREVIEW_SIZE}px;
  height: ${PREVIEW_SIZE}px;
  justify-content: center;
  align-items: center;
  padding: 2px;
  border-radius: ${RADII.sm}px;
  border-width: ${StyleSheet.hairlineWidth}px;
  border-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.background};
`;

export const PreviewPlaceholderText = styled.Text`
  ${textSize(11)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

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
