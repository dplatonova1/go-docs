import { Animated, StyleSheet } from 'react-native';
import styled from 'styled-components/native';

import { MIN_TOUCH_TARGET, RADII } from '../../theme/metrics';
import { FONTS, textSize } from '../../theme/typography';
import {
  TAB_BAR_BOTTOM_PADDING,
  TAB_BAR_TOP_PADDING,
  TAB_ICON_BUBBLE_SIZE,
} from './constants';
import type { BarStyleProps, TabStyleProps } from './types';

/**
 * Непрозрачная подложка цвета `background` под панелью. `surface`
 * полупрозрачный (`theme/colors.ts`), а под панелью, в отличие от
 * шапки и карточек, нет экрана — только фон окна Android. Он задан
 * нативно и может не совпадать с темой приложения (другая сборка,
 * тема выбрана в настройках вопреки системной): так панель в светлой
 * теме выходила тёмно-серой.
 */
export const Backdrop = styled.View`
  background-color: ${({ theme }) => theme.colors.background};
`;

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

/**
 * Ряд вкладок: ячейки равной ширины, под ними — пилюля активной вкладки
 * (`Pill`). Ширину ряда меряет `usePillIndicator`.
 */
export const TabsRow = styled.View`
  flex-grow: 1;
  flex-direction: row;
`;

/**
 * Пилюля активной вкладки — одна на ряд, переезжает при переключении
 * (`usePillIndicator`). Под содержимым вкладок: рисуется первой. Заливка
 * — `theme.tabs.activeFill`, положение и размер — из хука.
 */
export const Pill = styled(Animated.View)`
  position: absolute;
  top: 0;
  border-radius: ${RADII.pill}px;
`;

/**
 * Вкладка. Содержимое — у верхнего края: расстояние до границы панели
 * задаёт только `TAB_BAR_TOP_PADDING`.
 */
export const Tab = styled.Pressable`
  flex: 1;
  min-height: ${MIN_TOUCH_TARGET}px;
  align-items: center;
  justify-content: flex-start;
`;

/**
 * Содержимое вкладки: иконка и подпись. Своего фона нет — под активной
 * проезжает общая пилюля (`Pill`), и её высота — это высота содержимого
 * с вертикальными отступами отсюда.
 */
export const TabBody = styled.View`
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
`;

/**
 * Круг под иконкой неактивной вкладки. У активной он прозрачный, но
 * место держит — иначе пилюля была бы ниже неактивных вкладок.
 */
export const IconBubble = styled.View<TabStyleProps>`
  width: ${TAB_ICON_BUBBLE_SIZE}px;
  height: ${TAB_ICON_BUBBLE_SIZE}px;
  justify-content: center;
  align-items: center;
  border-radius: ${TAB_ICON_BUBBLE_SIZE / 2}px;
  background-color: ${({ theme, $selected }) =>
    $selected ? 'transparent' : theme.tabs.inactiveBubble};
`;

/**
 * Выбранная вкладка отличается формой (пилюля), цветом и полужирной
 * подписью: разницу одного цвета различают не все.
 */
export const TabLabel = styled.Text<TabStyleProps>`
  ${textSize(12)}
  font-family: ${({ $selected }) =>
    $selected ? FONTS.semibold : FONTS.regular};
  color: ${({ theme, $selected }) =>
    $selected ? theme.tabs.activeForeground : theme.tabs.inactiveForeground};
`;
