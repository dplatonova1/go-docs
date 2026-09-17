/**
 * Строка списка заявок: название и переход к её чек-листу.
 *
 * Вся строка — одна кнопка: отдельной кнопки «открыть» рядом с названием
 * не нужно, а тач-таргет получается во всю ширину.
 */

import { memo, useCallback } from 'react';

import { TEST_ID_PREFIX } from './constants';
import { Container, Title, pressedStyle } from './styles';
import type { ApplicationRowProps } from './types';

export const ApplicationRow = memo(function ApplicationRowImpl({
  application,
  index,
  total,
  onOpen,
}: ApplicationRowProps) {
  const number = index + 1;

  const handlePress = useCallback(
    () => onOpen(application),
    [application, onOpen],
  );

  return (
    <Container
      accessibilityRole="button"
      accessibilityLabel={`Заявка ${number} из ${total}: ${application.title}. Открыть чек-лист`}
      testID={`${TEST_ID_PREFIX}-${index}`}
      style={({ pressed }) => (pressed ? pressedStyle : undefined)}
      onPress={handlePress}
    >
      <Title>{application.title}</Title>
    </Container>
  );
});
