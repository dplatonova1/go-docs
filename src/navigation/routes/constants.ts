/** Контракт маршрутных обёрток для тестов и e2e. */
export const TEST_IDS = {
  checklistLoading: 'checklist-route-loading',
  checklistError: 'checklist-route-error',
  checklistRetryButton: 'checklist-route-retry-button',
  checklistMissing: 'checklist-route-missing',
  backToListButton: 'back-to-applications-button',
} as const;

export const MISSING_APPLICATION_MESSAGE =
  'Заявка удалена. Откройте другую из списка.';

/** Подтверждение ухода с недозаполненной формы создания заявки. */
export const LEAVE_CREATE_CONFIRMATION = {
  title: 'Выйти без сохранения?',
  message: 'Название и список пунктов не сохранены и пропадут.',
} as const;
