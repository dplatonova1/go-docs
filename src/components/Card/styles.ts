import { StyleSheet } from 'react-native';
import styled from 'styled-components/native';

import { RADII } from '../../theme/metrics';
import { CARD_MEDIA_SIZE } from './constants';

/**
 * Отступы — с референса: 18 точек по бокам, 16 сверху и снизу; между
 * содержимым и нижней строкой 16.
 */
export const Container = styled.View`
  gap: 16px;
  padding: 16px 18px;
  border-radius: ${RADII.card}px;
  background-color: ${({ theme }) => theme.colors.surface};
`;

/** Плитка картинки слева, содержимое справа. */
export const Body = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
`;

/** Строки содержимого — через 12, как на референсе. */
export const Content = styled.View`
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: 0;
  gap: 12px;
`;

/**
 * Плитка обрезает картинку по своему скруглению. Заливка и кант — из
 * `theme.card.media`, их подставляет компонент.
 */
export const MediaTile = styled.View`
  width: ${CARD_MEDIA_SIZE}px;
  height: ${CARD_MEDIA_SIZE}px;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: ${RADII.cardMedia}px;
`;

export const Divider = styled.View`
  height: ${StyleSheet.hairlineWidth}px;
  background-color: ${({ theme }) => theme.card.divider};
`;

export const Footer = styled.View`
  gap: 12px;
`;
