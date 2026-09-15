import { StyleSheet } from 'react-native';
import styled from 'styled-components/native';

import { RADII } from '../../../theme/metrics';

export const Container = styled.View`
  gap: 8px;
  padding: 12px;
  border-radius: ${RADII.lg}px;
  border-width: ${StyleSheet.hairlineWidth}px;
  border-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.surface};
`;

/**
 * Кнопки переносятся на следующую строку, а не сжимаются: при крупном
 * системном шрифте три кнопки в ряд на узком экране не помещаются.
 */
export const Actions = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;
