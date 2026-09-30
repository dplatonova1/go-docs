/**
 * Выбор темы: как в системе, светлая или тёмная.
 *
 * Применяется через `Appearance.setColorScheme` — переопределение темы на
 * уровне всего приложения. Поэтому все `useColorScheme()` (палитра,
 * навигация, шапка) перестраиваются сами, а на Android тему подхватывает
 * и нативная часть: системные диалоги и фон окна из `values-night`.
 *
 * Выбор хранится рядом с языком, в незашифрованном `settings.json`: это
 * предпочтение интерфейса, не данные пользователя
 * ([`storage/settings.ts`](../storage/settings.ts)).
 */

import { Appearance } from 'react-native';

import { readSettings, writeSetting } from '../storage/settings';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Порядок вариантов на экране настроек. */
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

const THEME_MODE_SETTING_KEY = 'themeMode';

let current: ThemeMode = 'system';

function toThemeMode(value: string | undefined): ThemeMode | null {
  return THEME_MODES.find(mode => mode === value) ?? null;
}

function apply(mode: ThemeMode): void {
  current = mode;
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}

/** Текущий выбор темы. */
export function getThemeMode(): ThemeMode {
  return current;
}

/**
 * Применяет сохранённый выбор. Вызывается один раз при запуске.
 * Нет выбора или он не разбирается — остаётся тема системы.
 */
export async function loadStoredThemeMode(): Promise<void> {
  const stored = toThemeMode((await readSettings())[THEME_MODE_SETTING_KEY]);

  if (stored !== null) {
    apply(stored);
  }
}

/**
 * Применяет и сохраняет выбор пользователя. Тема меняется сразу, до
 * записи; неудача записи уходит наверх — как у языка
 * ([`i18n/persistence.ts`](../i18n/persistence.ts)).
 */
export async function changeThemeMode(mode: ThemeMode): Promise<void> {
  apply(mode);
  await writeSetting(THEME_MODE_SETTING_KEY, mode);
}
