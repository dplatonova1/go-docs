/**
 * Публичный API переводов. Снаружи импортируют папку (`src/i18n`), а не
 * отдельные файлы внутри неё.
 *
 * Сохранение выбора языка сюда НЕ входит: [`persistence.ts`](./persistence.ts)
 * тянет за собой файловую систему, а тексты нужны чистым модулям —
 * подтверждениям, сообщениям об ошибках, реестру в PDF. Через барьер они
 * получали бы нативный `react-native-fs` вместе со словарём, и каждый
 * тест на формулировку начинался бы с его мока. Два места, которым
 * запись действительно нужна (запуск приложения и экран настроек),
 * импортируют `i18n/persistence` явно.
 */

export { FALLBACK_LOCALE, LOCALES, LOCALE_NAMES } from './constants';
export { getLocale, setLocale, translations } from './store';
export { detectSystemLocale } from './systemLocale';
export type { Locale, Messages } from './types';
export { useTranslation } from './useTranslation';
