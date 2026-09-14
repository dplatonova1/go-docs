import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

export type ButtonProps = Omit<
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

/** Пропсы оформления контейнера, см. `styles.ts`. */
export type ContainerStyleProps = {
  $disabled: boolean;
};
