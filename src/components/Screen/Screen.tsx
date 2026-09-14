/**
 * Базовая обёртка экрана.
 *
 * Берёт на себя то, что иначе повторяется на каждом экране и о чём легко
 * забыть: безопасные зоны (вырез камеры, скруглённые углы, индикатор
 * жестов), фон под текущую тему и подъём содержимого над клавиатурой.
 *
 * Клавиатура вынесена сюда не для красоты: полей ручного ввода в этом
 * приложении будет много — каждое автозаполненное поле пользователь
 * подтверждает руками (ADR-0005), — и экран, где клавиатура закрывает
 * поле ввода, здесь не частный случай, а норма.
 */

import { KEYBOARD_BEHAVIOR } from './constants';
import {
  KeyboardAvoider,
  Root,
  ScrollContainer,
  StaticContent,
} from './styles';
import type { ScreenProps } from './types';

export function Screen({ children, scrollable = true, testID }: ScreenProps) {
  const content = scrollable ? (
    <ScrollContainer
      // Иначе первое касание только прячет клавиатуру, и кнопку под ней
      // приходится нажимать дважды.
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollContainer>
  ) : (
    <StaticContent>{children}</StaticContent>
  );

  return (
    <Root testID={testID}>
      <KeyboardAvoider behavior={KEYBOARD_BEHAVIOR}>{content}</KeyboardAvoider>
    </Root>
  );
}
