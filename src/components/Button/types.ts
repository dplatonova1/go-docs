import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

/**
 * Назначение кнопки:
 * - `primary` — основное действие экрана;
 * - `secondary` — вспомогательное (добавить, переставить);
 * - `danger` — необратимое или удаляющее.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger';

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
  /** По умолчанию `primary`. */
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
};

/** Пропсы оформления контейнера, см. `styles.ts`. */
export type ContainerStyleProps = {
  $disabled: boolean;
  $variant: ButtonVariant;
};

/** Пропсы оформления надписи, см. `styles.ts`. */
export type LabelStyleProps = {
  $variant: ButtonVariant;
};
