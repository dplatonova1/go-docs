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
  /** Идёт удаление именно этого файла. */
  deletingDocumentId: DocumentId | null;
  /**
   * Кнопки пункта недоступны: с каким-то пунктом уже идёт работа
   * (системный пикер — один на приложение) или заявку сбрасывают.
   */
  actionsDisabled: boolean;
  /** Сообщение о неудачном прикреплении или удалении в этом пункте. */
  actionError: string | null;
  onAttach: (itemId: ChecklistItemId) => void;
  onDeleteFile: (itemId: ChecklistItemId, document: AttachedDocument) => void;
};

/** Пропсы оформления плашки статуса, см. `styles.ts`. */
export type StatusStyleProps = {
  $attached: boolean;
};
