/**
 * Базовая обёртка экрана.
 *
 * Берёт на себя то, что иначе повторяется на каждом экране и о чём легко
 * забыть: безопасные зоны (вырез камеры, скруглённые углы, индикатор
 * жестов) и подъём содержимого над клавиатурой.
 *
 * Клавиатура вынесена сюда не для красоты: полей ручного ввода в этом
 * приложении будет много — каждое автозаполненное поле пользователь
 * подтверждает руками (ADR-0005), — и экран, где клавиатура закрывает
 * поле ввода, здесь не частный случай, а норма.
 */

import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  /**
   * Прокручивать содержимое.
   *
   * По умолчанию включено: при увеличенном системном шрифте не помещается
   * почти любой экран, а этим приложением будут пользоваться в том числе
   * люди, которым крупный шрифт нужен.
   */
  scrollable?: boolean;
  testID?: string;
};

export function Screen({ children, scrollable = true, testID }: ScreenProps) {
  const content = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      // Иначе первое касание только прячет клавиатуру, и кнопку под ней
      // приходится нажимать дважды.
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.flex} testID={testID}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
});
