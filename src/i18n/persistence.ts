/**
 * Выбранный язык на диске.
 *
 * Отдельно от [`store.ts`](./store.ts), чтобы сам стор остался
 * синхронным и без зависимости от хранилища: тесты словарей и
 * переключения языка не должны мокать нативный слой.
 *
 * Файл настроек не зашифрован и читается до открытия базы — см.
 * [`storage/settings.ts`](../storage/settings.ts).
 */

import { readSettings, writeSetting } from '../storage/settings';
import { LOCALE_SETTING_KEY } from './constants';
import { setLocale } from './store';
import { toLocale } from './systemLocale';
import type { Locale } from './types';

/**
 * Применяет сохранённый выбор языка. Вызывается один раз при запуске, до
 * первых сообщений об ошибках.
 *
 * Если выбора нет или он не разбирается (файл поправили руками, язык
 * убрали из сборки), остаётся язык системы, которым стор
 * проинициализировался.
 */
export async function loadStoredLocale(): Promise<void> {
  const stored = toLocale((await readSettings())[LOCALE_SETTING_KEY]);

  if (stored !== null) {
    setLocale(stored);
  }
}

/**
 * Применяет и сохраняет выбор пользователя.
 *
 * Язык меняется сразу, до записи: интерфейс обязан ответить на нажатие
 * немедленно. Если запись не удалась, ошибка уходит наверх — экран
 * скажет, что выбор не переживёт перезапуск, вместо того чтобы молчать.
 */
export async function changeLocale(locale: Locale): Promise<void> {
  setLocale(locale);
  await writeSetting(LOCALE_SETTING_KEY, locale);
}
