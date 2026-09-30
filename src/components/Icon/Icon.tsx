/**
 * Иконка из набора приложения — залитый контур цвета `color`.
 *
 * Иконка декоративная: сама по себе скринридеру ничего не сообщает, смысл
 * несёт подпись или `accessibilityLabel` элемента, в котором она стоит.
 * Поэтому она скрыта от специальных возможностей.
 */

import Svg, { Path } from 'react-native-svg';

import { ICON_GRID, ICON_PATHS, ICON_SIZE } from './constants';
import type { IconProps } from './types';

export function Icon({ name, color, size = ICON_SIZE }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${ICON_GRID} ${ICON_GRID}`}
      fill={color}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={ICON_PATHS[name]} />
    </Svg>
  );
}
