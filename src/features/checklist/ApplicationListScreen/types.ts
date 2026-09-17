import type { Application } from '../model';

export type ApplicationListScreenProps = {
  /**
   * Экран виден пользователю.
   *
   * Список перечитывается на каждом возвращении фокуса: пока человек был
   * в чек-листе, заявку могли сбросить, а порядок «недавние сверху» —
   * измениться. Булев пропс, а не хук навигации, чтобы экран не зависел
   * от навигации и проверялся тестом без неё (ADR-0014).
   */
  isFocused?: boolean;
  onOpen: (application: Application) => void;
  onCreate: () => void;
};

export type ListState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | {
      readonly status: 'loaded';
      readonly applications: readonly Application[];
    };
