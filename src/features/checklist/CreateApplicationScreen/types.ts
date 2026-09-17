import type { Application } from '../model';

export type CreateApplicationScreenProps = {
  /** Заявка записана в БД — можно переходить к её чек-листу. */
  onCreated: (application: Application) => void;
  /**
   * В форме есть несохранённый ввод.
   *
   * Экран только сообщает об этом; спрашивать подтверждение при уходе —
   * дело маршрута, потому что уйти можно кнопкой «назад», жестом и
   * аппаратной кнопкой, и знает об этом навигация (ADR-0014).
   */
  onDirtyChange?: (isDirty: boolean) => void;
};

export type SaveState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving' }
  | { readonly status: 'failed'; readonly message: string };
