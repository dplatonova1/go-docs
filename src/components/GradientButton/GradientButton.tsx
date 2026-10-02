/**
 * Градиентная кнопка главного действия экрана: пилюля с надписью и,
 * если задана, иконкой слева. Заливка — одна из `theme.accents`
 * (`sunset` у «Создать заявку», `sky` у «Собрать пакет»), оформление —
 * с референсов, см. `theme/accent.ts`.
 *
 * `accessibilityLabel` обязателен, см. пояснение в
 * [`Button.tsx`](../Button/Button.tsx). Иконка декоративная: скринридер
 * читает только подпись.
 *
 * Цвет надписи и иконки — `foreground` заливки, а не цвет палитры:
 * почему — `theme/accent.ts`.
 *
 * Где кнопка стоит на экране, решает экран: компонент не позиционирует
 * себя сам и растягивается по ширине родителя.
 */

import { useTheme } from 'styled-components/native';

import { Icon } from '../Icon';
import { GRADIENT_ICON_SIZE } from './constants';
import { Container, Label, pressedStyle } from './styles';
import type { GradientButtonProps } from './types';

export function GradientButton({
  accent,
  icon,
  label,
  accessibilityLabel,
  testID,
  disabled,
  ...rest
}: GradientButtonProps) {
  const { fill, foreground } = useTheme().accents[accent];
  const isDisabled = disabled === true;

  return (
    <Container
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
      disabled={isDisabled}
      $disabled={isDisabled}
      style={({ pressed }) => [fill, pressed && pressedStyle]}
      {...rest}
    >
      {icon === undefined ? null : (
        <Icon name={icon} size={GRADIENT_ICON_SIZE} color={foreground} />
      )}
      <Label $accent={accent}>{label}</Label>
    </Container>
  );
}
