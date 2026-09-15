import {
  createDraftItems,
  createDraftKeyFactory,
  draftReducer,
  hasUnsavedInput,
  validateDraft,
  type DraftItem,
  type DraftItemKey,
} from '../draft';

function key(value: string): DraftItemKey {
  return value as DraftItemKey;
}

function item(k: string, label: string): DraftItem {
  return { key: key(k), label };
}

const ITEMS: readonly DraftItem[] = [
  item('a', 'Паспорт'),
  item('b', 'Фото'),
  item('c', 'Справка'),
];

function labels(items: readonly DraftItem[]): string[] {
  return items.map(i => i.label);
}

describe('createDraftKeyFactory', () => {
  it('выдаёт неповторяющиеся ключи, у каждой фабрики свой счёт', () => {
    const next = createDraftKeyFactory();
    const keys = [next(), next(), next()];
    expect(new Set(keys).size).toBe(3);
    expect(createDraftKeyFactory()()).toBe(keys[0]);
  });
});

describe('createDraftItems', () => {
  it('выдаёт каждому пункту свой ключ', () => {
    let n = 0;
    const items = createDraftItems(['А', 'Б'], () => key(`k${++n}`));
    expect(items).toEqual([item('k1', 'А'), item('k2', 'Б')]);
  });
});

describe('draftReducer', () => {
  it('replaceAll заменяет список целиком', () => {
    const next = draftReducer(ITEMS, {
      type: 'replaceAll',
      items: [item('x', 'Новый')],
    });
    expect(next).toEqual([item('x', 'Новый')]);
  });

  it('add добавляет пустой пункт в конец', () => {
    const next = draftReducer(ITEMS, { type: 'add', key: key('d') });
    expect(next).toHaveLength(4);
    expect(next[3]).toEqual(item('d', ''));
  });

  it('edit меняет текст только своего пункта и сохраняет ссылки остальных', () => {
    const next = draftReducer(ITEMS, {
      type: 'edit',
      key: key('b'),
      label: 'Фото 3×4',
    });
    expect(labels(next)).toEqual(['Паспорт', 'Фото 3×4', 'Справка']);
    expect(next[0]).toBe(ITEMS[0]);
    expect(next[2]).toBe(ITEMS[2]);
  });

  it('remove удаляет пункт', () => {
    const next = draftReducer(ITEMS, { type: 'remove', key: key('b') });
    expect(labels(next)).toEqual(['Паспорт', 'Справка']);
  });

  it('move up меняет пункт местами с предыдущим', () => {
    const next = draftReducer(ITEMS, {
      type: 'move',
      key: key('c'),
      direction: 'up',
    });
    expect(labels(next)).toEqual(['Паспорт', 'Справка', 'Фото']);
  });

  it('move down меняет пункт местами со следующим', () => {
    const next = draftReducer(ITEMS, {
      type: 'move',
      key: key('a'),
      direction: 'down',
    });
    expect(labels(next)).toEqual(['Фото', 'Паспорт', 'Справка']);
  });

  it.each([
    ['первый вверх', 'a', 'up'],
    ['последний вниз', 'c', 'down'],
    ['несуществующий', 'zzz', 'up'],
  ] as const)(
    'move за границу списка (%s) ничего не меняет',
    (_n, k, direction) => {
      const next = draftReducer(ITEMS, {
        type: 'move',
        key: key(k),
        direction,
      });
      expect(next).toBe(ITEMS);
    },
  );

  it('не мутирует исходный список', () => {
    const snapshot = [...ITEMS];
    draftReducer(ITEMS, { type: 'move', key: key('a'), direction: 'down' });
    draftReducer(ITEMS, { type: 'remove', key: key('a') });
    draftReducer(ITEMS, { type: 'edit', key: key('a'), label: 'x' });
    expect(ITEMS).toEqual(snapshot);
  });
});

describe('validateDraft', () => {
  it('корректный черновик: обрезает пробелы и сохраняет порядок', () => {
    const result = validateDraft('  ВНЖ Сербия ', [
      item('a', ' Паспорт '),
      item('b', 'Фото'),
    ]);

    expect(result).toEqual({
      ok: true,
      value: { title: 'ВНЖ Сербия', itemLabels: ['Паспорт', 'Фото'] },
    });
  });

  it('оформляет пункты так же, как разбор текста', () => {
    const result = validateDraft('ВНЖ', [
      item('a', ' копия паспорта; '),
      item('b', 'фото 3×4,'),
    ]);

    expect(result).toEqual({
      ok: true,
      value: { title: 'ВНЖ', itemLabels: ['Копия паспорта', 'Фото 3×4'] },
    });
  });

  it('пункт из одних разделителей считается пустым', () => {
    const result = validateDraft('ВНЖ', [
      item('a', 'Паспорт'),
      item('b', ' ; '),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect([...result.errors.emptyItemKeys]).toEqual(['b']);
    }
  });

  it('пустое название — ошибка', () => {
    const result = validateDraft('   ', [item('a', 'Паспорт')]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.titleMissing).toBe(true);
      expect(result.errors.noItems).toBe(false);
    }
  });

  it('без пунктов — ошибка', () => {
    const result = validateDraft('ВНЖ', []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.noItems).toBe(true);
      expect(result.errors.titleMissing).toBe(false);
    }
  });

  it('пустой пункт не выбрасывается молча, а помечается', () => {
    const result = validateDraft('ВНЖ', [
      item('a', 'Паспорт'),
      item('b', '  '),
      item('c', ''),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect([...result.errors.emptyItemKeys]).toEqual(['b', 'c']);
      expect(result.errors.noItems).toBe(false);
    }
  });
});

describe('hasUnsavedInput', () => {
  it('пустой экран терять нечего', () => {
    expect(hasUnsavedInput(' ', '\n', [])).toBe(false);
  });

  it.each([
    ['название', 'ВНЖ', '', []],
    ['вставленный текст', '', 'Паспорт', []],
    ['пункты', '', '', [item('a', '')]],
  ] as const)('есть %s — есть что терять', (_n, title, text, items) => {
    expect(hasUnsavedInput(title, text, items)).toBe(true);
  });
});
