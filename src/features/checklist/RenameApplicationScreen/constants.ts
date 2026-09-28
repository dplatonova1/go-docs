import type { SaveState } from './types';

export const IDLE: SaveState = { status: 'idle' };

export const SAVING: SaveState = { status: 'saving' };

/** Контракт экрана для тестов и e2e. */
export const TEST_IDS = {
  screen: 'rename-application-screen',
  titleInput: 'rename-application-title-input',
  saveButton: 'rename-application-save-button',
  cancelButton: 'rename-application-cancel-button',
  saveError: 'rename-application-error',
} as const;
