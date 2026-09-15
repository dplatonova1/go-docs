/**
 * Префикс `testID` строки: `checklist-item-0`, а внутри неё
 * `-label`, `-status`, `-file-0`, `-attach`, `-attach-error`.
 */
export const TEST_ID_PREFIX = 'checklist-item';

/**
 * Статус текстом, а не только цветом: иначе его не различат люди с
 * нарушением цветовосприятия и не прочтёт скринридер.
 */
export const STATUS_TEXT = {
  attached: 'Прикреплено',
  notAttached: 'Не прикреплено',
} as const;

/** Показывается вместо имени, если источник файла его не сообщил. */
export const UNNAMED_FILE = 'Файл без имени';
