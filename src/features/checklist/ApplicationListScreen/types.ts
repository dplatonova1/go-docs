import type { Application, ApplicationId } from '../model';

export type ApplicationListScreenProps = {
  /**
   * Экран виден пользователю.
   *
   * Список перечитывается на каждом возвращении фокуса: пока человек был
   * в чек-листе или переименовывал заявку, данные могли измениться, а
   * порядок «недавние сверху» — поехать. Булев пропс, а не хук
   * навигации, чтобы экран не зависел от навигации и проверялся тестом
   * без неё (ADR-0014).
   */
  isFocused?: boolean;
  onOpen: (application: Application) => void;
  onRename: (application: Application) => void;
  onCreate: () => void;
  /** Открыть библиотеку документов — она одна на все заявки. */
  onOpenLibrary: () => void;
  /** Открыть настройки — язык приложения и всё, что появится после. */
  onOpenSettings: () => void;
};

export type ListState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | {
      readonly status: 'loaded';
      readonly applications: readonly Application[];
    };

/** Удаление заявки: подсчёт последствий, ожидание, неудача. */
export type DeleteState =
  | { readonly status: 'idle' }
  | { readonly status: 'working'; readonly applicationId: ApplicationId }
  | { readonly status: 'failed'; readonly message: string };
