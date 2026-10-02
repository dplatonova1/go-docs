import type { PressableProps } from 'react-native';

import type { AccentName } from '../../theme/accent';
import type { ThemeColors } from '../../theme/colors';
import type { IconName } from '../Icon';

/**
 * Оформление: либо только цвет иконки из палитры (кнопка без фона), либо
 * заливка из `theme.accents` — круг в стилистике `Button` того же
 * варианта (у «Открепить» — `rose`, как у кнопок удаления).
 */
type IconButtonLook =
  | {
      /** Цвет иконки — имя из палитры, чтобы пара с фоном оставалась проверенной. */
      color: keyof ThemeColors;
      accent?: never;
    }
  | {
      /** Круг с заливкой; иконка — цвета надписи этой заливки. */
      accent: AccentName;
      color?: never;
    };

export type IconButtonProps = Omit<
  PressableProps,
  'accessibilityLabel' | 'accessibilityRole' | 'children' | 'style' | 'testID'
> &
  IconButtonLook & {
    icon: IconName;
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
  /** Есть заливка — кнопка круглая. */
  $filled: boolean;
};
