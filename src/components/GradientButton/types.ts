import type { PressableProps } from 'react-native';

import type { AccentName } from '../../theme/accent';
import type { IconName } from '../Icon';

export type GradientButtonProps = Omit<
  PressableProps,
  'accessibilityLabel' | 'accessibilityRole' | 'children' | 'style' | 'testID'
> & {
  /** Заливка из `theme.accents`, см. `theme/accent.ts`. */
  accent: AccentName;
  /** Иконка слева от надписи. Без неё — только надпись. */
  icon?: IconName;
  /** Видимая надпись. */
  label: string;
  /**
   * Что услышит пользователь скринридера. Обязателен, как у `Button`:
   * короткая надпись может не описывать действие целиком.
   */
  accessibilityLabel: string;
  testID: string;
};

/** Пропсы оформления контейнера, см. `styles.ts`. */
export type ContainerStyleProps = {
  $disabled: boolean;
};

/** Пропсы оформления надписи, см. `styles.ts`. */
export type LabelStyleProps = {
  $accent: AccentName;
};
