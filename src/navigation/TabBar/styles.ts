import { StyleSheet } from 'react-native';
import styled from 'styled-components/native';

import { MIN_TOUCH_TARGET } from '../../theme/metrics';
import { FONTS, textSize } from '../../theme/typography';
import { TAB_BAR_BOTTOM_PADDING, TAB_BAR_TOP_PADDING } from './constants';
import type { BarStyleProps, TabStyleProps } from './types';

/**
 * Панель — поверхность, как шапка: цвет `surface`, сверху разделитель.
 */
export const Bar = styled.View<BarStyleProps>`
  flex-direction: row;
  padding-top: ${TAB_BAR_TOP_PADDING}px;
  padding-bottom: ${({ $bottomInset }) =>
    $bottomInset + TAB_BAR_BOTTOM_PADDING}px;
  border-top-width: ${StyleSheet.hairlineWidth}px;
  border-top-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.surface};
`;

export const Tab = styled.Pressable`
  flex: 1;
  min-height: ${MIN_TOUCH_TARGET}px;
  align-items: center;
  /* Иконка — у верхнего края вкладки: расстояние до границы панели
     задаёт только \`TAB_BAR_TOP_PADDING\`. */
  justify-content: flex-start;
  gap: 2px;
`;

/**
 * Выбранная вкладка — цветом `indicator` (иконка и подпись) и
 * полужирной подписью: разницу одного цвета различают не все.
 */
export const TabLabel = styled.Text<TabStyleProps>`
  ${textSize(12)}
  font-family: ${({ $selected }) =>
    $selected ? FONTS.semibold : FONTS.regular};
  margin-top: 4px;
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.indicator : theme.colors.textSecondary};
`;
