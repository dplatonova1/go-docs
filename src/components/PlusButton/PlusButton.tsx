/**
 * Кнопка «добавить» — иконка `add` (плюс в круге), главное действие
 * экрана.
 *
 * Видимой надписи нет, поэтому `accessibilityLabel` обязателен и
 * описывает действие целиком («Создать новую заявку»), см. пояснение в
 * [`Button.tsx`](../Button/Button.tsx). Иконка декоративная: скринридер
 * читает только подпись.
 *
 * Цвет — `text`, а не `primary` или `indicator`: иконка — единственное,
 * что обозначает кнопку, а из цветов палитры контраст к фону обеих тем
 * гарантирует только `text`.
 *
 * Где кнопка стоит на экране, решает экран: компонент не позиционирует
 * себя сам.
 */

import { useTheme } from 'styled-components/native';

import { Icon } from '../Icon';
import { PLUS_BUTTON_SIZE } from './constants';
import { Container, pressedStyle } from './styles';
import type { PlusButtonProps } from './types';

export function PlusButton({
  accessibilityLabel,
  testID,
  disabled,
  ...rest
}: PlusButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled === true;

  return (
    <Container
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
      disabled={isDisabled}
      $disabled={isDisabled}
      style={({ pressed }) => (pressed ? pressedStyle : undefined)}
      {...rest}
    >
      <Icon name="add" size={PLUS_BUTTON_SIZE} color={theme.colors.text} />
    </Container>
  );
}
