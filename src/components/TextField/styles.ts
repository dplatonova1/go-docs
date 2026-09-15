import { StyleSheet } from 'react-native';
import styled from 'styled-components/native';

import { MIN_TOUCH_TARGET, RADII } from '../../theme/metrics';
import { FONTS, textSize } from '../../theme/typography';
import { INPUT_VERTICAL_PADDING, LINE_HEIGHT_ESTIMATE } from './constants';
import type { InputStyleProps } from './types';

export const Container = styled.View`
  gap: 4px;
`;

export const Label = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.text};
`;

export const Input = styled.TextInput<InputStyleProps>`
  min-height: ${({ $minLines }) =>
    Math.max(
      MIN_TOUCH_TARGET,
      $minLines * LINE_HEIGHT_ESTIMATE + INPUT_VERTICAL_PADDING,
    )}px;
  border-radius: ${RADII.md}px;
  padding: 8px 12px;
  ${textSize(16)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.text};
  /* Android по умолчанию центрирует текст многострочного поля по
     вертикали — пустое высокое поле выглядит так, будто ввод посередине. */
  text-align-vertical: ${({ $multiline }) => ($multiline ? 'top' : 'auto')};
  border-width: ${({ $hasError }) =>
    $hasError ? 1 : StyleSheet.hairlineWidth}px;
  /* Рамка — единственная граница поля, поэтому \`border\` (3:1), а не
     декоративный \`divider\`. */
  border-color: ${({ theme, $hasError }) =>
    $hasError ? theme.colors.danger : theme.colors.border};
`;

export const ErrorText = styled.Text`
  ${textSize(13)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.danger};
`;
