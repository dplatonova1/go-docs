import type { Application } from '../../features/checklist/model';

/**
 * Что показать при запуске.
 *
 * Фаза 1: заявка одна, поэтому состояний ровно два рабочих — «заявки
 * нет» и «заявка есть» — плюс загрузка и отказ хранилища.
 */
export type LaunchState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | { readonly status: 'needsApplication' }
  | { readonly status: 'ready'; readonly application: Application };
