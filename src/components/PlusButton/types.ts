import type { PressableProps } from 'react-native';

export type PlusButtonProps = Omit<
  PressableProps,
  'accessibilityLabel' | 'accessibilityRole' | 'children' | 'style' | 'testID'
> & {
  /**
   * Что услышит пользователь скринридера. Видимой надписи у кнопки нет,
   * поэтому это единственное описание действия.
   */
  accessibilityLabel: string;
  testID: string;
};

/** Пропсы оформления контейнера, см. `styles.ts`. */
export type ContainerStyleProps = {
  $disabled: boolean;
};
