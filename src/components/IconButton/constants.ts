import { MIN_TOUCH_TARGET } from '../../theme/metrics';

/** Размер иконки по умолчанию; кнопка вокруг неё — не меньше тач-таргета. */
export const ICON_BUTTON_ICON_SIZE = 24;

/**
 * Кнопка с заливкой (`accent`) — круг меньше тач-таргета, чтобы не
 * спорить с содержимым строки (решено 2026-10-03). Зона касания при этом
 * прежняя, `MIN_TOUCH_TARGET`: недостающее добирает `hitSlop`.
 */
export const FILLED_ICON_BUTTON_SIZE = 32;

/** Иконка в круге с заливкой — пропорционально кругу. */
export const FILLED_ICON_SIZE = 18;

/** Сколько добрать до `MIN_TOUCH_TARGET` с каждой стороны круга. */
export const FILLED_HIT_SLOP = (MIN_TOUCH_TARGET - FILLED_ICON_BUTTON_SIZE) / 2;

/** Прозрачность нажатой и недоступной кнопки — как у `Button`. */
export { DISABLED_OPACITY, PRESSED_OPACITY } from '../Button/constants';
