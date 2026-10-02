/**
 * Кнопка-иконка без видимой надписи.
 *
 * `accessibilityLabel` обязателен и должен называть действие целиком,
 * см. пояснение в [`Button.tsx`](../Button/Button.tsx). Пока действие
 * выполняется (`busy`), вместо иконки крутится спиннер того же цвета, а
 * скринридер получает состояние «занято».
 *
 * С `accent` кнопка — круг с заливкой из `theme.accents`, в стилистике
 * `Button` (решено 2026-10-02): «Открепить» — как кнопки удаления.
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
  accent,
  accessibilityLabel,
  testID,
  busy = false,
  size = ICON_BUTTON_ICON_SIZE,
  disabled,
  ...rest
}: IconButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled === true || busy;
  // Ровно одно из двух задано — это обещает тип `IconButtonLook`.
  const fill = accent === undefined ? undefined : theme.accents[accent];
  const tint =
    fill !== undefined ? fill.foreground : theme.colors[color ?? 'text'];

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
      $filled={fill !== undefined}
      style={({ pressed }) => [fill?.fill, pressed && pressedStyle]}
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
