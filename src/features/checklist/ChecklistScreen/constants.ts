import type { AttachState, DeleteState, ItemsState, ResetState } from './types';

export const LOADING: ItemsState = { status: 'loading' };

export const ATTACH_IDLE: AttachState = { status: 'idle' };

export const DELETE_IDLE: DeleteState = { status: 'idle' };

export const RESET_IDLE: ResetState = { status: 'idle' };

export const RESET_WORKING: ResetState = { status: 'working' };

/** Контракт экрана для тестов и e2e. */
export const TEST_IDS = {
  screen: 'checklist-screen',
  list: 'checklist-items-list',
  loading: 'checklist-loading',
  loadError: 'checklist-load-error',
  retryButton: 'checklist-retry-button',
  resetButton: 'reset-application-button',
  resetError: 'reset-application-error',
} as const;
