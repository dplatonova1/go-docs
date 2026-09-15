import type { LaunchState } from './types';

export const LOADING: LaunchState = { status: 'loading' };

/** Контракт корневого экрана для тестов и e2e. */
export const TEST_IDS = {
  loading: 'launch-loading',
  failed: 'launch-failed',
  retryButton: 'launch-retry-button',
} as const;
