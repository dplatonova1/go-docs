import type { Application } from '../model';

export type RenameApplicationScreenProps = {
  /** Заявка с текущим названием — её загрузил маршрут. */
  application: Application;
  /** Название сохранено. */
  onRenamed: () => void;
  /** Пользователь отказался от переименования. */
  onCancel: () => void;
};

export type SaveState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving' }
  | { readonly status: 'failed'; readonly message: string };
