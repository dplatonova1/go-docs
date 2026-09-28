/**
 * Язык устройства — чтобы при первом запуске приложение заговорило на
 * знакомом языке, ничего не спрашивая.
 *
 * Читается из нативных модулей напрямую, без `react-native-localize`:
 * ради одной строки при старте новая нативная зависимость потребовала бы
 * `pod install`, проверки merged-манифеста и 16 KB page size
 * ([ADR-0009](../../docs/adr/0009-minimal-android-permissions.md)).
 *
 * Официального JS-API для языка системы в React Native нет, поэтому
 * каждое обращение обёрнуто: неизвестная сборка, мок в тестах или
 * будущее переименование поля дадут `null`, а не падение при старте.
 * Результат — всего лишь значение по умолчанию, и ошибиться в нём не
 * страшно: выбор пользователя всё равно важнее.
 */

import { NativeModules, Platform } from 'react-native';

import { LOCALES } from './constants';
import type { Locale } from './types';

/**
 * Языковой тег в язык приложения.
 *
 * Берётся только первый субтег: `ru_RU`, `ru-RU` и `ru` — один и тот же
 * русский, а регион и письменность на выбор словаря не влияют.
 */
export function toLocale(languageTag: unknown): Locale | null {
  if (typeof languageTag !== 'string') {
    return null;
  }

  const primary = languageTag.toLowerCase().split(/[-_]/)[0];

  return LOCALES.find(locale => locale === primary) ?? null;
}

function androidLanguageTag(): unknown {
  return NativeModules.I18nManager?.localeIdentifier;
}

/**
 * На iOS язык живёт в `SettingsManager`: `AppleLocale` есть не во всех
 * версиях iOS, поэтому следом проверяется первый предпочитаемый язык.
 */
function iosLanguageTag(): unknown {
  const settings = NativeModules.SettingsManager?.settings;

  if (settings === undefined || settings === null) {
    return undefined;
  }

  const languages: unknown = settings.AppleLanguages;

  return (
    settings.AppleLocale ??
    (Array.isArray(languages) ? languages[0] : undefined)
  );
}

/**
 * @returns язык системы, если он поддерживается приложением, иначе
 * `null` — решать, чем его заменить, вызывающему.
 */
export function detectSystemLocale(): Locale | null {
  try {
    return toLocale(
      Platform.OS === 'ios' ? iosLanguageTag() : androidLanguageTag(),
    );
  } catch {
    return null;
  }
}
