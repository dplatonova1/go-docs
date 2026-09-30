import type { PressableProps } from 'react-native';

import type { ThemeColors } from '../../theme/colors';
import type { IconName } from '../Icon';

export type IconButtonProps = Omit<
  PressableProps,
  'accessibilityLabel' | 'accessibilityRole' | 'children' | 'style' | 'testID'
> & {
  icon: IconName;
  /** Цвет иконки — имя из палитры, чтобы пара с фоном оставалась проверенной. */
  color: keyof ThemeColors;
  /**
   * Что услышит пользователь скринридера. Видимой надписи нет, поэтому
   * подпись описывает действие целиком — с тем, к чему оно относится.
   */
  accessibilityLabel: string;
  testID: string;
  /** Действие выполняется: вместо иконки спиннер, кнопка недоступна. */
  busy?: boolean;
  /** Размер иконки. По умолчанию `ICON_BUTTON_ICON_SIZE`. */
  size?: number;
};

/** Пропсы оформления контейнера, см. `styles.ts`. */
export type ContainerStyleProps = {
  $disabled: boolean;
};
