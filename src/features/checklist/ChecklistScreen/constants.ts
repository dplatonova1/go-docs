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

/**
 * Сообщения дедупликации (ADR-0018). Показываются вместо тихого
 * повторения обычного прикрепления: пользователь выбрал файл и вправе
 * знать, что второй копии не появилось.
 */
export const DEDUPLICATION_NOTICE = {
  reused:
    'Этот файл уже был в библиотеке — прикреплён без повторной загрузки.',
  alreadyAttached: 'Этот файл уже прикреплён к этому пункту.',
} as const;

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
} as const;
