import type {
  Application,
  ChecklistItem,
  ChecklistItemId,
  DocumentId,
} from '../model';

export type ChecklistScreenProps = {
  application: Application;
  /** Заявка удалена — вернуться к созданию новой. */
  onReset: () => void;
};

export type ItemsState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | { readonly status: 'loaded'; readonly items: readonly ChecklistItem[] };

export type AttachState =
  | { readonly status: 'idle' }
  | { readonly status: 'working'; readonly itemId: ChecklistItemId }
  | {
      readonly status: 'failed';
      readonly itemId: ChecklistItemId;
      readonly message: string;
    };

export type DeleteState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'working';
      readonly itemId: ChecklistItemId;
      readonly documentId: DocumentId;
    }
  | {
      readonly status: 'failed';
      readonly itemId: ChecklistItemId;
      readonly message: string;
    };

export type ResetState =
  | { readonly status: 'idle' }
  | { readonly status: 'working' }
  | { readonly status: 'failed'; readonly message: string };
