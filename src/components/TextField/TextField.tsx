/**
 * Поле ввода с подписью и сообщением об ошибке.
 *
 * `accessibilityLabel` и `testID` обязательны в типах — см. пояснение в
 * [`Button.tsx`](../Button/Button.tsx).
 *
 * Оформление — с референса, см. `theme/field.ts`: в покое полупрозрачная
 * подложка с бликом и кантом, в фокусе градиентная рамка и свечение, при
 * ошибке красная рамка, у отключённого поля тусклее текст.
 *
 * Градиентная рамка — общий [`GradientRing`](../GradientRing): у
 * `borderColor` градиента нет. При ошибке она не рисуется: красная
 * важнее.
 */

import { useCallback, useState } from 'react';
import type { BlurEvent, FocusEvent } from 'react-native';
import { useTheme } from 'styled-components/native';

import { RADII } from '../../theme/metrics';
import { GradientRing } from '../GradientRing';

import { ERROR_TEST_ID_SUFFIX } from './constants';
import {
  Container,
  ErrorText,
  Field,
  Input,
  Label,
  withErrorRing,
} from './styles';
import type { TextFieldProps } from './types';

export function TextField({
  label,
  accessibilityLabel,
  testID,
  error,
  minLines = 1,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const hasError = error !== undefined && error.length > 0;
  const isDisabled = rest.editable === false;

  const handleFocus = useCallback(
    (event: FocusEvent) => {
      setIsFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (event: BlurEvent) => {
      setIsFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  const fieldStyle = isFocused ? theme.field.focused : theme.field.rest;
  const showFocusBorder = isFocused && !hasError;

  return (
    <Container>
      <Label>{label}</Label>

      <Field
        style={
          hasError ? withErrorRing(fieldStyle, theme.colors.danger) : fieldStyle
        }
      >
        <Input
          accessibilityLabel={accessibilityLabel}
          testID={testID}
          $multiline={rest.multiline === true}
          $minLines={minLines}
          $disabled={isDisabled}
          // До `rest`, чтобы экран мог задать свой цвет плейсхолдера.
          placeholderTextColor={
            isDisabled
              ? theme.colors.placeholderDisabled
              : theme.colors.textSecondary
          }
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {showFocusBorder ? <GradientRing radius={RADII.field} /> : null}
      </Field>

      {hasError ? (
        <ErrorText
          // Ошибку нужно объявить вслух в момент появления, иначе
          // пользователь скринридера узнает о ней, только вернувшись к
          // полю. accessibilityLiveRegion работает на Android, role=alert
          // на iOS.
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={`${testID}${ERROR_TEST_ID_SUFFIX}`}
        >
          {error}
        </ErrorText>
      ) : null}
    </Container>
  );
}
