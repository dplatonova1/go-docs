import type { SaveState } from './types';

export const IDLE: SaveState = { status: 'idle' };

/** Префикс `testID` строки языка: `settings-locale-ru`, `-en`. */
export const LOCALE_TEST_ID_PREFIX = 'settings-locale';

/** Контракт экрана для тестов и e2e. */
export const TEST_IDS = {
  screen: 'settings-screen',
  languageGroup: 'settings-language-group',
  saveError: 'settings-language-error',
} as const;
