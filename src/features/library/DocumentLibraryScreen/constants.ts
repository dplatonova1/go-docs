import type { ActionState, ListState } from './types';

export const LOADING: ListState = { status: 'loading' };

export const ACTION_IDLE: ActionState = { status: 'idle' };

/** Контракт экрана для тестов и e2e. */
export const TEST_IDS = {
  screen: 'document-library-screen',
  list: 'document-library-list',
  loading: 'document-library-loading',
  loadError: 'document-library-error',
  retryButton: 'document-library-retry-button',
  actionError: 'document-library-action-error',
  empty: 'document-library-empty',
} as const;
