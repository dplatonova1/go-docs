import type { DraftItem } from '../draft';
import type { SaveState } from './types';

export const EMPTY_DRAFT: readonly DraftItem[] = [];

export const IDLE: SaveState = { status: 'idle' };

export const SAVING: SaveState = { status: 'saving' };

/** Высота поля вставки: список документов обычно на много строк. */
export const PASTED_TEXT_MIN_LINES = 6;

/** Контракт экрана для тестов и e2e. */
export const TEST_IDS = {
  screen: 'create-application-screen',
  list: 'draft-items-list',
  titleInput: 'application-title-input',
  checklistTextInput: 'checklist-text-input',
  parseButton: 'parse-checklist-button',
  addItemButton: 'add-checklist-item-button',
  saveButton: 'save-application-button',
  titleError: 'draft-title-error',
  noItemsError: 'draft-no-items-error',
  emptyItemsError: 'draft-empty-items-error',
  saveError: 'save-application-error',
} as const;

export const TITLE_REQUIRED_ERROR = 'Укажите название заявки';

export const NOTHING_PARSED_ERROR =
  'В тексте не нашлось ни одного пункта. Проверьте текст или добавьте пункты вручную.';

export const NO_ITEMS_ERROR = 'Добавьте хотя бы один пункт';

export const EMPTY_ITEMS_ERROR =
  'Есть пустые пункты — заполните или удалите их';
