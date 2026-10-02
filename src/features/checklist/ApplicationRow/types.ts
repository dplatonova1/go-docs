import type { Application } from '../model';

export type ApplicationRowProps = {
  application: Application;
  /** Позиция в списке с нуля. */
  index: number;
  total: number;
  onOpen: (application: Application) => void;
  onRename: (application: Application) => void;
};
