import type { BootstrapState } from './types';

export const LOADING: BootstrapState = { status: 'loading' };

/** Контракт корневого экрана для тестов и e2e. */
export const TEST_IDS = {
  loading: 'launch-loading',
  failed: 'launch-failed',
  retryButton: 'launch-retry-button',
} as const;
