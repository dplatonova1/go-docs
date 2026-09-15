/**
 * Префикс `testID` строки: `draft-item-0`, а внутри неё
 * `draft-item-0-input`, `-move-up`, `-move-down`, `-remove`. Номер —
 * позиция в списке, как её видит пользователь, поэтому после перестановки
 * тот же testID указывает на другой пункт.
 */
export const TEST_ID_PREFIX = 'draft-item';

/** Высота поля пункта: требования в списках часто длиннее одной строки. */
export const ITEM_MIN_LINES = 2;

export const EMPTY_ITEM_ERROR = 'Пустой пункт: заполните или удалите его';
