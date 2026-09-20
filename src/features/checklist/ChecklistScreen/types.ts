import type { PackageBuildResult } from '../../package';
import type {
  Application,
  ChecklistItem,
  ChecklistItemId,
  DocumentId,
} from '../model';

export type ChecklistScreenProps = {
  application: Application;
  /**
   * Экран виден пользователю. Пункты перечитываются при возвращении
   * фокуса: файл могли прикрепить из библиотеки на другом экране.
   */
  isFocused?: boolean;
  /** Открыть библиотеку, чтобы выбрать файл для этого пункта. */
  onPickFromLibrary: (itemId: ChecklistItemId) => void;
  /** Заявка удалена — вернуться к списку заявок. */
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
    }
  /**
   * Прикрепление удалось, но прошло не так, как ожидает пользователь:
   * файл уже был в библиотеке и связался без повторной загрузки. Это не
   * ошибка, поэтому и показывается иначе — обычным текстом, а не
   * красным (ADR-0018).
   */
  | {
      readonly status: 'notice';
      readonly itemId: ChecklistItemId;
      readonly message: string;
    };

export type DetachState =
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

/**
 * Сборка пакета.
 *
 * `preparing` — читаются пункты и считается план (в том числе место на
 * устройстве); `building` — идёт обработка документов по одному;
 * `done` — пакет готов и отдан в share sheet, его можно отправить ещё
 * раз, не собирая заново.
 */
export type PackageState =
  | { readonly status: 'idle' }
  | { readonly status: 'preparing' }
  | {
      readonly status: 'building';
      readonly processed: number;
      readonly total: number;
    }
  | { readonly status: 'failed'; readonly message: string }
  | { readonly status: 'done'; readonly result: PackageBuildResult };

export type ResetState =
  | { readonly status: 'idle' }
  | { readonly status: 'working' }
  | { readonly status: 'failed'; readonly message: string };
