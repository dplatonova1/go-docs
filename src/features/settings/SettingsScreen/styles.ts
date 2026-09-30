import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { MIN_TOUCH_TARGET, RADII } from '../../../theme/metrics';
import { FONTS, textSize } from '../../../theme/typography';
import type { OptionStyleProps } from './types';

export const Section = styled.View`
  gap: 8px;
`;

export const SectionTitle = styled.Text`
  ${textSize(17)}
  font-family: ${FONTS.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

export const Hint = styled.Text`
  ${textSize(15)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/** Языки списком в столбик: их немного, и каждый читается целиком. */
export const OptionList = styled.View`
  gap: 8px;
  margin-top: 4px;
`;

/**
 * Строка языка.
 *
 * Выбранную обозначает не только цвет рамки, но и подпись рядом
 * («Выбран»): цветом одним различие не передать людям с нарушением
 * цветовосприятия, а скринридеру его сообщает `accessibilityState`.
 */
export const Option = styled.Pressable<OptionStyleProps>`
  min-height: ${MIN_TOUCH_TARGET}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  border-radius: ${RADII.lg}px;
  border-width: ${({ $selected }) =>
    $selected ? 2 : StyleSheet.hairlineWidth}px;
  border-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.indicator : theme.colors.border};
  background-color: ${({ theme }) => theme.colors.surface};
`;

/** См. `components/Button/styles.ts`: Pressable отдаёт нажатие колбэком. */
export const pressedStyle: ViewStyle = toStyleSheet(css`
  opacity: 0.7;
`);

export const OptionLabel = styled.Text<OptionStyleProps>`
  ${textSize(17)}
  font-family: ${({ $selected }) =>
    $selected ? FONTS.semibold : FONTS.regular};
  color: ${({ theme }) => theme.colors.text};
`;

export const SelectedMark = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const ErrorText = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.danger};
`;
