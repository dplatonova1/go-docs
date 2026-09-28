import type {
  AttachState,
  DetachState,
  ItemsState,
  PackageState,
  ResetState,
} from './types';

export const LOADING: ItemsState = { status: 'loading' };

export const ATTACH_IDLE: AttachState = { status: 'idle' };

export const DETACH_IDLE: DetachState = { status: 'idle' };

export const PACKAGE_IDLE: PackageState = { status: 'idle' };

export const PACKAGE_PREPARING: PackageState = { status: 'preparing' };

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
  packageSummary: 'package-summary',
  packageButton: 'build-package-button',
  packageShareButton: 'share-package-button',
  packageProgress: 'package-progress',
  packageError: 'package-error',
  packageResult: 'package-result',
  packageQualityWarning: 'package-quality-warning',
} as const;
