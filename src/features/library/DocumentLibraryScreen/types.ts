import type { ChecklistItemId, LibraryDocument } from '../../checklist/model';
import type { LibraryMode } from '../DocumentRow';

export type DocumentLibraryScreenProps = {
  /**
   * Пункт, для которого выбирают файл. `null` — библиотека открыта на
   * просмотр, и прикреплять не к чему.
   */
  itemId: ChecklistItemId | null;
  /** Экран виден пользователю — см. `ApplicationListScreen`. */
  isFocused?: boolean;
  /** Документ прикреплён к пункту: вернуться к чек-листу. */
  onAttached: () => void;
};

export type ListState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | {
      readonly status: 'loaded';
      readonly documents: readonly LibraryDocument[];
    };

/** Прикрепление или удаление: идёт работа либо она не удалась. */
export type ActionState =
  | { readonly status: 'idle' }
  | { readonly status: 'working'; readonly documentId: string }
  | { readonly status: 'failed'; readonly message: string };

export type { LibraryMode };
