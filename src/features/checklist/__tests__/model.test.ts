import {
  isAttached,
  withAttachedDocument,
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

describe('isAttached', () => {
  it('по наличию документов, а не по колонке status', () => {
    expect(isAttached(item('a', { status: 'attached' }))).toBe(false);
    expect(isAttached(item('a', { documents: [DOCUMENT] }))).toBe(true);
  });
});
