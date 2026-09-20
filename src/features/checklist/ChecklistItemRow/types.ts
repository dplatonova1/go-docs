import type {
  AttachedDocument,
  ChecklistItem,
  ChecklistItemId,
  DocumentId,
} from '../model';

export type ChecklistItemRowProps = {
  item: ChecklistItem;
  /** Позиция в списке с нуля. */
  index: number;
  total: number;
  /** Идёт прикрепление файла именно к этому пункту. */
  isAttaching: boolean;
  /** Идёт открепление именно этого файла. */
  detachingDocumentId: DocumentId | null;
  /**
   * Кнопки пункта недоступны: с каким-то пунктом уже идёт работа
   * (системный пикер — один на приложение) или заявку сбрасывают.
   */
  actionsDisabled: boolean;
  /** Сообщение о неудачном прикреплении или откреплении в этом пункте. */
  actionError: string | null;
  /**
   * Сообщение об успешном, но необычном исходе — например, файл уже был
   * в библиотеке. Не ошибка, поэтому и цвет обычный.
   */
  actionNotice: string | null;
  onAttach: (itemId: ChecklistItemId) => void;
  /** Выбрать файл, уже загруженный в приложение, вместо новой загрузки. */
  onPickFromLibrary: (itemId: ChecklistItemId) => void;
  onDetachFile: (itemId: ChecklistItemId, document: AttachedDocument) => void;
};

/** Пропсы оформления плашки статуса, см. `styles.ts`. */
export type StatusStyleProps = {
  $attached: boolean;
};
