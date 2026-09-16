import {
  isAttached,
  withAttachedDocument,
  withoutDocument,
  type ChecklistItem,
  type ChecklistItemId,
  type DocumentId,
} from '../model';

function item(
  id: string,
  overrides: Partial<ChecklistItem> = {},
): ChecklistItem {
  return {
    id: id as ChecklistItemId,
    label: id,
    position: 0,
    status: 'pending',
    documents: [],
    ...overrides,
  };
}

const DOCUMENT = { id: 'd1' as DocumentId, name: 'scan.pdf' };

describe('withAttachedDocument', () => {
  it('добавляет документ к своему пункту и отмечает его прикреплённым', () => {
    const items = [item('a'), item('b')];

    const next = withAttachedDocument(items, 'b' as ChecklistItemId, DOCUMENT);

    expect(next[1]).toEqual({
      ...items[1],
      status: 'attached',
      documents: [DOCUMENT],
    });
    expect(isAttached(next[1]!)).toBe(true);
    // Остальные пункты — те же объекты: мемоизированные строки не
    // перерисовываются.
    expect(next[0]).toBe(items[0]);
  });

  it('дописывает второй документ после первого', () => {
    const first = { id: 'd0' as DocumentId, name: null };
    const items = [item('a', { status: 'attached', documents: [first] })];

    const next = withAttachedDocument(items, 'a' as ChecklistItemId, DOCUMENT);

    expect(next[0]?.documents).toEqual([first, DOCUMENT]);
  });

  it('статус «готово» прикрепление не понижает', () => {
    const items = [item('a', { status: 'done' })];

    const next = withAttachedDocument(items, 'a' as ChecklistItemId, DOCUMENT);

    expect(next[0]?.status).toBe('done');
  });
});

describe('withoutDocument', () => {
  const OTHER = { id: 'd2' as DocumentId, name: 'second.pdf' };

  it('убирает файл и возвращает пункт в «не прикреплено»', () => {
    const items = [
      item('a'),
      item('b', { status: 'attached', documents: [DOCUMENT] }),
    ];

    const next = withoutDocument(items, 'b' as ChecklistItemId, DOCUMENT.id);

    expect(next[1]?.documents).toEqual([]);
    expect(next[1]?.status).toBe('pending');
    expect(isAttached(next[1]!)).toBe(false);
    expect(next[0]).toBe(items[0]);
  });

  it('пока остаются другие файлы, пункт остаётся прикреплённым', () => {
    const items = [
      item('a', { status: 'attached', documents: [DOCUMENT, OTHER] }),
    ];

    const next = withoutDocument(items, 'a' as ChecklistItemId, DOCUMENT.id);

    expect(next[0]?.documents).toEqual([OTHER]);
    expect(next[0]?.status).toBe('attached');
  });

  it('статус «готово» не понижает', () => {
    const items = [item('a', { status: 'done', documents: [DOCUMENT] })];

    const next = withoutDocument(items, 'a' as ChecklistItemId, DOCUMENT.id);

    expect(next[0]?.status).toBe('done');
  });

  it('неизвестный файл ничего не меняет', () => {
    const items = [item('a', { status: 'attached', documents: [DOCUMENT] })];

    const next = withoutDocument(items, 'a' as ChecklistItemId, OTHER.id);

    expect(next[0]).toBe(items[0]);
  });
});

describe('isAttached', () => {
  it('по наличию документов, а не по колонке status', () => {
    expect(isAttached(item('a', { status: 'attached' }))).toBe(false);
    expect(isAttached(item('a', { documents: [DOCUMENT] }))).toBe(true);
  });
});
