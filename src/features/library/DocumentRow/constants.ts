/**
 * Префикс `testID` строки: `library-document-0`, а внутри неё
 * `-preview`, `-attach`, `-delete`.
 */
export const TEST_ID_PREFIX = 'library-document';

/** Показывается вместо имени, если источник его не сообщил. */
export const UNNAMED_DOCUMENT = 'Файл без имени';

/** Что написано вместо превью, когда картинки нет. */
export const PREVIEW_PLACEHOLDER = {
  none: 'Без превью',
  loading: 'Превью…',
  failed: 'Файл недоступен',
} as const;
