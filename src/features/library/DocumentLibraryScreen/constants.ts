import type { ActionState, ListState } from './types';

export const LOADING: ListState = { status: 'loading' };

export const ACTION_IDLE: ActionState = { status: 'idle' };

export const EMPTY_HINT = {
  browse:
    'Библиотека пуста. Файлы попадают сюда, когда вы прикрепляете их к ' +
    'пунктам чек-листа, и остаются после удаления заявки.',
  pick:
    'В библиотеке пока нет файлов. Прикрепите первый с устройства — ' +
    'дальше его можно будет переиспользовать в других заявках.',
} as const;

/** Показывается, если документ уже был прикреплён к этому пункту. */
export const ALREADY_ATTACHED_MESSAGE =
  'Этот файл уже прикреплён к пункту.';

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
