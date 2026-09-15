import type { ChecklistItem, ChecklistItemId } from '../model';

export type ChecklistItemRowProps = {
  item: ChecklistItem;
  /** Позиция в списке с нуля. */
  index: number;
  total: number;
  /** Идёт прикрепление файла именно к этому пункту. */
  isAttaching: boolean;
  /**
   * Кнопка прикрепления недоступна: прикрепление к какому-то пункту уже
   * идёт (системный пикер — один на приложение) или заявку сбрасывают.
   */
  attachDisabled: boolean;
  /** Сообщение о неудачном прикреплении к этому пункту. */
  attachError: string | null;
  onAttach: (itemId: ChecklistItemId) => void;
};

/** Пропсы оформления плашки статуса, см. `styles.ts`. */
export type StatusStyleProps = {
  $attached: boolean;
};
