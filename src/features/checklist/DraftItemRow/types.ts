import type { DraftItem, DraftItemKey, MoveDirection } from '../draft';

export type DraftItemRowProps = {
  item: DraftItem;
  /** Позиция в списке с нуля — для номера, testID и границ перестановки. */
  index: number;
  total: number;
  /** Пункт пуст, а пользователь уже пытался сохранить. */
  hasError: boolean;
  /** Поставить фокус в поле при появлении — для только что добавленного. */
  autoFocus: boolean;
  onChangeLabel: (key: DraftItemKey, label: string) => void;
  onMove: (key: DraftItemKey, direction: MoveDirection) => void;
  onRemove: (key: DraftItemKey) => void;
};
