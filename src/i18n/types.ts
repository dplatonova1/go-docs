/**
 * Типы слоя переводов.
 *
 * `Messages` выводится из русского словаря ([`locales/ru.ts`](./locales/ru.ts)):
 * он — источник правды по набору ключей, английский обязан ему
 * соответствовать. Пропущенный или лишний ключ в `en` — ошибка tsc, а не
 * пустая строка на экране (см. [ADR-0021](../../docs/adr/0021-runtime-localization.md)).
 */

import type { ru } from './locales/ru';

/** Языки приложения. Добавление нового — новый файл в `locales/`. */
export type Locale = 'ru' | 'en';

/** Полный набор строк одного языка. */
export type Messages = typeof ru;
