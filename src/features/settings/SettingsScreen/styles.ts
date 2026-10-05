import type { ViewStyle } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { RADII } from '../../../theme/metrics';
import { FONTS, textSize } from '../../../theme/typography';
import { OPTION_MIN_HEIGHT } from './constants';
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
 * Строка языка или темы — в форме поля ввода (`theme/field.ts`):
 * в покое подложка с бликом и кантом, выбранная — со свечением и
 * градиентной рамкой, как поле в фокусе (решено 2026-10-02). Подложку и
 * рамку подставляет экран: они задаются объектом стиля и компонентом.
 *
 * Выбранную обозначает не только рамка, но и подпись рядом («Выбран»):
 * цветом одним различие не передать людям с нарушением цветовосприятия,
 * а скринридеру его сообщает `accessibilityState`.
 */
export const Option = styled.Pressable`
  min-height: ${OPTION_MIN_HEIGHT}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 20px;
  border-radius: ${RADII.field}px;
  background-color: ${({ theme }) => theme.colors.surface};
`;

/** См. `components/Button/styles.ts`: Pressable отдаёт нажатие колбэком. */
export const pressedStyle: ViewStyle = toStyleSheet(css`
  opacity: 0.7;
`);

export const OptionLabel = styled.Text<OptionStyleProps>`
  ${textSize(17)}
  font-family: ${FONTS.regular};
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
