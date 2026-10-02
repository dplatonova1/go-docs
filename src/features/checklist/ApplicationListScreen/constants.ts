import type { ListState } from './types';

export const LOADING: ListState = { status: 'loading' };

/** Отступ кнопки создания от списка над ней. */
export const CREATE_BUTTON_GAP = 4;

/** Контракт экрана для тестов и e2e. */
export const TEST_IDS = {
  screen: 'application-list-screen',
  list: 'application-list',
  loading: 'application-list-loading',
  loadError: 'application-list-error',
  retryButton: 'application-list-retry-button',
  createButton: 'create-application-button',
  libraryButton: 'open-document-library-button',
  settingsButton: 'open-settings-button',
  empty: 'application-list-empty',
} as const;
