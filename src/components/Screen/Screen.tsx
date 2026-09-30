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

import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';

import { DEFAULT_EDGES, KEYBOARD_BEHAVIOR } from './constants';
import {
  KeyboardAvoider,
  Root,
  ScrollContainer,
  StaticContent,
} from './styles';
import type { ScreenProps } from './types';

export function Screen({
  children,
  scrollable = true,
  edges = DEFAULT_EDGES,
  testID,
}: ScreenProps) {
  // Над нижней панелью вкладок отступа снизу нет — содержимое доходит до
  // панели. Контекст задан только внутри навигатора вкладок; экраны вне
  // него (загрузка при запуске) сохраняют отступ.
  const flushBottom = useContext(BottomTabBarHeightContext) !== undefined;

  const content = scrollable ? (
    <ScrollContainer
      $flushBottom={flushBottom}
      // Иначе первое касание только прячет клавиатуру, и кнопку под ней
      // приходится нажимать дважды.
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollContainer>
  ) : (
    <StaticContent $flushBottom={flushBottom}>{children}</StaticContent>
  );

  return (
    <Root edges={edges} testID={testID}>
      <KeyboardAvoider behavior={KEYBOARD_BEHAVIOR}>{content}</KeyboardAvoider>
    </Root>
  );
}
