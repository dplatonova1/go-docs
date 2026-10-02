import type { ViewStyle } from 'react-native';
import styled from 'styled-components/native';

import { RADII } from '../../theme/metrics';
import { FONTS, textSize } from '../../theme/typography';
import { GRADIENT_RING_WIDTH } from '../GradientRing';
import {
  FIELD_MIN_HEIGHT,
  INPUT_VERTICAL_PADDING,
  LINE_HEIGHT_ESTIMATE,
} from './constants';
import type { InputStyleProps } from './types';

export const Container = styled.View`
  gap: 4px;
`;

export const Label = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.text};
`;

/**
 * Подложка поля: форма и заливка. Блик, кант и свечение — объектом из
 * `theme.field` (см. `theme/field.ts`), их подставляет компонент.
 */
export const Field = styled.View`
  border-radius: ${RADII.field}px;
  background-color: ${({ theme }) => theme.colors.surface};
`;

export const Input = styled.TextInput<InputStyleProps>`
  min-height: ${({ $minLines }) =>
    Math.max(
      FIELD_MIN_HEIGHT,
      $minLines * LINE_HEIGHT_ESTIMATE + INPUT_VERTICAL_PADDING,
    )}px;
  padding: ${INPUT_VERTICAL_PADDING / 2}px 20px;
  ${textSize(16)}
  font-family: ${FONTS.regular};
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.textSecondary : theme.colors.text};
  /* Android по умолчанию центрирует текст многострочного поля по
     вертикали — пустое высокое поле выглядит так, будто ввод посередине. */
  text-align-vertical: ${({ $multiline }) => ($multiline ? 'top' : 'auto')};
`;

/**
 * Красная рамка ошибки — внутренней тенью, а не `border-width`: так она
 * не сдвигает текст и не спорит с бликом подложки (см. `theme/accent.ts`
 * про рамку поверх градиента). Добавляется к теням `theme.field`, а не
 * заменяет их.
 */
export function withErrorRing(base: ViewStyle, color: string): ViewStyle {
  const shadows = Array.isArray(base.boxShadow) ? base.boxShadow : [];
  return {
    ...base,
    boxShadow: [
      ...shadows,
      {
        inset: true,
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadDistance: GRADIENT_RING_WIDTH,
        color,
      },
    ],
  };
}

export const ErrorText = styled.Text`
  ${textSize(13)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.danger};
`;
