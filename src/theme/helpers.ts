/**
 * Общие помощники файлов темы.
 */

import type { BoxShadowValue } from 'react-native';

/**
 * Кант в 1 точку — внутренней тенью без размытия, а не `borderWidth`:
 * градиент (`backgroundImage`) рисуется только внутри рамки и под ней
 * повторяется с противоположного края, а `backgroundOrigin` в React
 * Native нет. Тот же приём у кнопок, карточек, полей и вкладок.
 */
export function rim(color: string): BoxShadowValue {
  return {
    inset: true,
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadDistance: 1,
    color,
  };
}
