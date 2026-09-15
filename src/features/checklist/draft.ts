/**
 * Черновик списка пунктов до сохранения.
 *
 * Результат эвристики `parseChecklistText` не пишется в БД сразу:
 * пользователь правит его здесь — добавляет, редактирует, удаляет и
 * переставляет пункты — и только подтверждённый список уходит в
 * `checklist_items`.
 *
 * Логика — чистые функции без React, чтобы проверять её тестами без
 * рендера экрана.
 */

import {
  toNonEmptyText,
  type NewApplication,
  type NonEmptyText,
} from './model';
import { formatChecklistLabel } from './parseChecklistText';

/**
 * Ключ пункта черновика. Не id из БД: пункта в базе ещё нет. Нужен для
 * `keyExtractor` — индекс в качестве ключа ломает фокус и мемоизацию
 * строк при удалении и перестановке.
 */
export type DraftItemKey = string & { readonly __brand: 'DraftItemKey' };

export type DraftItem = {
  readonly key: DraftItemKey;
  readonly label: string;
};

export type MoveDirection = 'up' | 'down';

export type DraftAction =
  | { readonly type: 'replaceAll'; readonly items: readonly DraftItem[] }
  | { readonly type: 'add'; readonly key: DraftItemKey }
  | {
      readonly type: 'edit';
      readonly key: DraftItemKey;
      readonly label: string;
    }
  | { readonly type: 'remove'; readonly key: DraftItemKey }
  | {
      readonly type: 'move';
      readonly key: DraftItemKey;
      readonly direction: MoveDirection;
    };

/**
 * Источник ключей черновика: `draft-1`, `draft-2`, … Уникальность нужна
 * только в пределах одного экрана, поэтому достаточно счётчика.
 */
export function createDraftKeyFactory(): () => DraftItemKey {
  let counter = 0;
  return () => `draft-${++counter}` as DraftItemKey;
}

/** `keyExtractor` для списка черновика. */
export function draftItemKeyOf(item: DraftItem): string {
  return item.key;
}

/**
 * Ключи создаются снаружи и приходят в действии, а не генерируются в
 * редьюсере: редьюсер остаётся чистым, и тест знает ключи заранее.
 */
export function createDraftItems(
  labels: readonly string[],
  nextKey: () => DraftItemKey,
): DraftItem[] {
  return labels.map(label => ({ key: nextKey(), label }));
}

export function draftReducer(
  items: readonly DraftItem[],
  action: DraftAction,
): readonly DraftItem[] {
  switch (action.type) {
    case 'replaceAll':
      return action.items;
    case 'add':
      return [...items, { key: action.key, label: '' }];
    case 'edit':
      // Остальные элементы сохраняют ссылку — мемоизированные строки
      // списка не перерисовываются на каждое нажатие клавиши.
      return items.map(item =>
        item.key === action.key ? { ...item, label: action.label } : item,
      );
    case 'remove':
      return items.filter(item => item.key !== action.key);
    case 'move':
      return moveItem(items, action.key, action.direction);
    default: {
      const unhandled: never = action;
      return unhandled;
    }
  }
}

function moveItem(
  items: readonly DraftItem[],
  key: DraftItemKey,
  direction: MoveDirection,
): readonly DraftItem[] {
  const from = items.findIndex(item => item.key === key);
  const to = direction === 'up' ? from - 1 : from + 1;
  const moving = items[from];
  const target = items[to];

  // Первый пункт выше не поднять, последний ниже не опустить — это не
  // ошибка, а пустое действие (кнопки там и так недоступны).
  if (moving === undefined || target === undefined) {
    return items;
  }

  const next = [...items];
  next[from] = target;
  next[to] = moving;
  return next;
}

export type DraftErrors = {
  readonly titleMissing: boolean;
  readonly noItems: boolean;
  /** Пункты, текст которых пуст или состоит из пробелов. */
  readonly emptyItemKeys: ReadonlySet<DraftItemKey>;
};

export type DraftValidation =
  | { readonly ok: true; readonly value: NewApplication }
  | { readonly ok: false; readonly errors: DraftErrors };

/**
 * Проверяет черновик перед сохранением.
 *
 * Пустой пункт не выбрасывается молча, а считается ошибкой: пользователь
 * мог нажать «Добавить пункт» и не успеть его заполнить, и тихое
 * исчезновение выглядело бы как потеря.
 *
 * Пункты оформляются тем же `formatChecklistLabel`, что и при разборе:
 * добавленный вручную пункт не должен сохраниться «паспортом;», если
 * пользователь нажал «Сохранить», не выходя из поля. Пункт из одних
 * разделителей («;») после оформления пуст — и тоже ошибка.
 */
export function validateDraft(
  title: string,
  items: readonly DraftItem[],
): DraftValidation {
  const validTitle = toNonEmptyText(title);
  const labels: NonEmptyText[] = [];
  const emptyItemKeys = new Set<DraftItemKey>();

  for (const item of items) {
    const label = toNonEmptyText(formatChecklistLabel(item.label));
    if (label === null) {
      emptyItemKeys.add(item.key);
    } else {
      labels.push(label);
    }
  }

  const [first, ...rest] = labels;

  if (validTitle !== null && first !== undefined && emptyItemKeys.size === 0) {
    return {
      ok: true,
      value: { title: validTitle, itemLabels: [first, ...rest] },
    };
  }

  return {
    ok: false,
    errors: {
      titleMissing: validTitle === null,
      noItems: items.length === 0,
      emptyItemKeys,
    },
  };
}

/** Есть ли что терять при уходе с экрана. */
export function hasUnsavedInput(
  title: string,
  pastedText: string,
  items: readonly DraftItem[],
): boolean {
  return (
    title.trim().length > 0 || pastedText.trim().length > 0 || items.length > 0
  );
}
