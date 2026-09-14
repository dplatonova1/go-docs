/**
 * Кнопка.
 *
 * `accessibilityLabel` и `testID` объявлены обязательными намеренно:
 * без них компонент не пройдёт проверку типов.
 *
 * Почему так, а не «не забудьте добавить»: доступность в этом проекте
 * заявлена как требование с первого дня, а линтер ловит только
 * отсутствие пропса в разметке — он не заставит его добавить, если
 * компонент позволяет обойтись. Обязательный тип заставляет.
 *
 * Заготовка: оформление минимальное, финальный дизайн будет позже.
 */

import { Container, Label, containerShadow, pressedStyle } from './styles';
import type { ButtonProps } from './types';

export function Button({
  label,
  accessibilityLabel,
  testID,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled === true;

  return (
    <Container
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // Скринридер должен сообщать, что кнопка недоступна, а не молча
      // её озвучивать как обычную.
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
      disabled={isDisabled}
      $disabled={isDisabled}
      style={({ pressed }) => [
        containerShadow,
        pressed && pressedStyle,
        style,
      ]}
      {...rest}
    >
      <Label>{label}</Label>
    </Container>
  );
}
