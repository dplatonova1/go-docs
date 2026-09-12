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

import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type ButtonProps = Omit<
  PressableProps,
  'accessibilityLabel' | 'accessibilityRole' | 'children' | 'style' | 'testID'
> & {
  /** Видимая надпись на кнопке. */
  label: string;
  /**
   * Что услышит пользователь скринридера. Отдельно от `label`: видимая
   * надпись бывает короткой ради вёрстки («Далее»), а вслух нужно
   * понятное действие («Перейти к загрузке документов»).
   */
  accessibilityLabel: string;
  testID: string;
  style?: StyleProp<ViewStyle>;
};

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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // Скринридер должен сообщать, что кнопка недоступна, а не молча
      // её озвучивать как обычную.
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // 44 — минимальный тач-таргет, ниже которого в кнопку тяжело попасть.
    // Это не элемент оформления, менять при редизайне нельзя.
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    // Без явного размера текст не масштабируется предсказуемо при
    // увеличенном системном шрифте.
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
