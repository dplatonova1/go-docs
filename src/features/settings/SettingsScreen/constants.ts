import type { SaveState } from './types';

export const IDLE: SaveState = { status: 'idle' };

/** Префикс `testID` строки языка: `settings-locale-ru`, `-en`. */
export const LOCALE_TEST_ID_PREFIX = 'settings-locale';

/** Префикс `testID` строки темы: `settings-theme-system`, `-light`, `-dark`. */
export const THEME_TEST_ID_PREFIX = 'settings-theme';

/** Контракт экрана для тестов и e2e. */
export const TEST_IDS = {
  screen: 'settings-screen',
  languageGroup: 'settings-language-group',
  saveError: 'settings-language-error',
  themeGroup: 'settings-theme-group',
  themeSaveError: 'settings-theme-error',
} as const;

/** Высота строки выбора — как у однострочного поля ввода. */
export const OPTION_MIN_HEIGHT = 52;
