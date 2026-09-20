import type { DeleteState, ListState } from './types';

export const LOADING: ListState = { status: 'loading' };

export const DELETE_IDLE: DeleteState = { status: 'idle' };

export const EMPTY_HINT =
  'Заявок пока нет. Создайте первую: понадобится название и список ' +
  'документов с сайта ведомства.';

/** Контракт экрана для тестов и e2e. */
export const TEST_IDS = {
  screen: 'application-list-screen',
  list: 'application-list',
  loading: 'application-list-loading',
  loadError: 'application-list-error',
  retryButton: 'application-list-retry-button',
  createButton: 'create-application-button',
  libraryButton: 'open-document-library-button',
  deleteError: 'application-delete-error',
  empty: 'application-list-empty',
} as const;
