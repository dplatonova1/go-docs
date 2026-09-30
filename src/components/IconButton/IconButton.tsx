/**
 * Кнопка-иконка без видимой надписи.
 *
 * `accessibilityLabel` обязателен и должен называть действие целиком,
 * см. пояснение в [`Button.tsx`](../Button/Button.tsx). Пока действие
 * выполняется (`busy`), вместо иконки крутится спиннер того же цвета, а
 * скринридер получает состояние «занято».
 */

import { ActivityIndicator } from 'react-native';
import { useTheme } from 'styled-components/native';

import { Icon } from '../Icon';
import { ICON_BUTTON_ICON_SIZE } from './constants';
import { Container, pressedStyle } from './styles';
import type { IconButtonProps } from './types';

export function IconButton({
  icon,
  color,
  accessibilityLabel,
  testID,
  busy = false,
  size = ICON_BUTTON_ICON_SIZE,
  disabled,
  ...rest
}: IconButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled === true || busy;
  const tint = theme.colors[color];

  return (
    <Container
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy }}
      testID={testID}
      disabled={isDisabled}
      // Во время работы кнопка не тускнеет: спиннер и так показывает, что
      // нажимать не нужно, а бледный спиннер плохо видно.
      $disabled={isDisabled && !busy}
      style={({ pressed }) => (pressed ? pressedStyle : undefined)}
      {...rest}
    >
      {busy ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <Icon name={icon} size={size} color={tint} />
      )}
    </Container>
  );
}
