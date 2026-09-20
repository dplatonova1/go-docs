import type { LibraryDocument } from '../../checklist/model';

/**
 * Что делает строка библиотеки.
 *
 * `browse` — просмотр всей библиотеки: доступно удаление файла с
 * устройства. `pick` — выбор файла для пункта чек-листа: доступно
 * прикрепление, удалять отсюда нельзя, чтобы необратимое действие не
 * оказалось рядом с обычным выбором.
 */
export type LibraryMode = 'browse' | 'pick';

export type DocumentRowProps = {
  document: LibraryDocument;
  /** Позиция в списке с нуля. */
  index: number;
  total: number;
  mode: LibraryMode;
  /** С каким-то документом уже идёт работа. */
  actionsDisabled: boolean;
  /** Идёт действие именно с этим документом. */
  isBusy: boolean;
  onAttach: (document: LibraryDocument) => void;
  onDelete: (document: LibraryDocument) => void;
};
