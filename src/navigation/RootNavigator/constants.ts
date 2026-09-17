import type { BootstrapState } from './types';

export const LOADING: BootstrapState = { status: 'loading' };

/** Заголовки в шапке навигации. Заголовок чек-листа — название заявки. */
export const SCREEN_TITLES = {
  applicationList: 'Заявки',
  createApplication: 'Новая заявка',
} as const;

/** Контракт корневого экрана для тестов и e2e. */
export const TEST_IDS = {
  loading: 'launch-loading',
  failed: 'launch-failed',
  retryButton: 'launch-retry-button',
} as const;
