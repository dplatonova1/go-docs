import type { Application } from '../model';

export type CreateApplicationScreenProps = {
  /** Заявка записана в БД — можно переходить к её чек-листу. */
  onCreated: (application: Application) => void;
};

export type SaveState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving' }
  | { readonly status: 'failed'; readonly message: string };
