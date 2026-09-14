/**
 * Поле ввода с подписью и сообщением об ошибке.
 *
 * `accessibilityLabel` и `testID` обязательны в типах — см. пояснение в
 * [`Button.tsx`](../Button/Button.tsx).
 *
 * Заготовка: оформление минимальное, финальный дизайн будет позже.
 */

import { useTheme } from 'styled-components/native';

import { ERROR_TEST_ID_SUFFIX } from './constants';
import { Container, ErrorText, Input, Label } from './styles';
import type { TextFieldProps } from './types';

export function TextField({
  label,
  accessibilityLabel,
  testID,
  error,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const hasError = error !== undefined && error.length > 0;

  return (
    <Container>
      <Label>{label}</Label>

      <Input
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        $hasError={hasError}
        // До `rest`, чтобы экран мог задать свой цвет плейсхолдера.
        placeholderTextColor={theme.colors.textSecondary}
        {...rest}
      />

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
