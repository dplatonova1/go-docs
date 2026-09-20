import type { Application } from '../model';

export type ApplicationRowProps = {
  application: Application;
  /** Позиция в списке с нуля. */
  index: number;
  total: number;
  /**
   * Действия недоступны: с какой-то заявкой уже идёт работа. Удаление
   * необратимо, и два подтверждения подряд не должны наложиться.
   */
  actionsDisabled: boolean;
  /** Идёт удаление именно этой заявки. */
  isDeleting: boolean;
  onOpen: (application: Application) => void;
  onRename: (application: Application) => void;
  onDelete: (application: Application) => void;
};
