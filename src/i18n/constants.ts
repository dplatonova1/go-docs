import { en } from './locales/en';
import { ru } from './locales/ru';
import type { Locale, Messages } from './types';

/** Словари по языкам. Объект на язык один и тот же между рендерами. */
export const MESSAGES = { ru, en } satisfies Record<Locale, Messages>;

/** Порядок в переключателе языка на экране настроек. */
export const LOCALES: readonly Locale[] = ['ru', 'en'];

/**
 * Названия языков — на них самих и НЕ переводятся.
 *
 * Человек, которому приложение досталось на незнакомом языке, ищет в
 * списке знакомое слово. «Английский» ему в этот момент не поможет, а
 * «English» — поможет.
 */
export const LOCALE_NAMES = {
  ru: 'Русский',
  en: 'English',
} satisfies Record<Locale, string>;

/**
 * Язык, когда система не сказала ничего понятного.
 *
 * Английский, а не русский: аудитория продукта — люди за границей, и
 * нераспознанный язык системы чаще означает «не русскоязычное
 * устройство», чем сбой.
 */
export const FALLBACK_LOCALE: Locale = 'en';

/** Ключ, под которым выбор языка лежит в файле настроек. */
export const LOCALE_SETTING_KEY = 'locale';
