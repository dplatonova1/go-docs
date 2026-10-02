/**
 * План сборки: что войдёт в пакет и сколько это займёт.
 *
 * Оценка размера нужна до начала работы: по ней проверяется свободное
 * место. Недооценка здесь хуже переоценки — «места не хватило» на
 * середине сборки оставляет человека ни с чем.
 */

import type {
  ChecklistItemId,
  DocumentId,
  PackageEntry,
} from '../../checklist/model';
import { documentsToProcess, planPackage } from '../plan';

const MEGABYTE = 1024 * 1024;

function document(
  id: string,
  mimeType: string | null,
  sizeBytes: number | null = MEGABYTE,
) {
  return {
    id: id as DocumentId,
    name: `${id}.file`,
    mimeType,
    sizeBytes,
    filePath: `documents/${id}`,
  };
}

function entry(
  id: string,
  label: string,
  position: number,
  documents: PackageEntry['documents'],
): PackageEntry {
  return { itemId: id as ChecklistItemId, label, position, documents };
}

it('нумерует пункты по порядку чек-листа', () => {
  const plan = planPackage([
    entry('i1', 'Паспорт', 0, [document('d1', 'application/pdf')]),
    entry('i2', 'Фото', 1, [document('d2', 'image/jpeg')]),
  ]);

  expect(plan.entries.map(item => [item.itemNumber, item.itemLabel])).toEqual([
    [1, 'Паспорт'],
    [2, 'Фото'],
  ]);
});

it('различает изображения, PDF и всё остальное', () => {
  const plan = planPackage([
    entry('i1', 'Пункт', 0, [
      document('d1', 'image/jpeg'),
      document('d2', 'image/png'),
      document('d3', 'application/pdf'),
      // Записи до ограничения типов пикера: их встроить нечем.
      document(
        'd4',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
      document('d5', 'image/heic'),
      document('d6', null),
    ]),
  ]);

  expect(plan.entries[0]?.documents.map(item => item.kind)).toEqual([
    'image',
    'image',
    'pdf',
    'unsupported',
    'unsupported',
    'unsupported',
  ]);
  expect(plan.includedDocumentCount).toBe(3);
  expect(plan.unsupportedDocumentCount).toBe(3);
});

it('считает пункты с файлами и без', () => {
  const plan = planPackage([
    entry('i1', 'Паспорт', 0, [document('d1', 'application/pdf')]),
    entry('i2', 'Справка', 1, []),
    entry('i3', 'Фото', 2, [document('d2', 'image/jpeg')]),
  ]);

  expect(plan.attachedItemCount).toBe(2);
  expect(plan.itemCount).toBe(3);
});

describe('оценка размера', () => {
  it('PDF учитывается целиком, изображение — со сжатием', () => {
    const pdfOnly = planPackage([
      entry('i1', 'Пункт', 0, [document('d1', 'application/pdf', MEGABYTE)]),
    ]);
    const imageOnly = planPackage([
      entry('i1', 'Пункт', 0, [document('d1', 'image/jpeg', MEGABYTE)]),
    ]);

    expect(imageOnly.estimatedBytes).toBeLessThan(pdfOnly.estimatedBytes);
  });

  it('включает запас и место под реестр', () => {
    const plan = planPackage([
      entry('i1', 'Пункт', 0, [document('d1', 'application/pdf', MEGABYTE)]),
    ]);

    // 1 МБ + 20% запаса + титульная страница.
    expect(plan.estimatedBytes).toBeGreaterThan(MEGABYTE * 1.2);
  });

  it('невстраиваемые документы места не занимают', () => {
    const withUnsupported = planPackage([
      entry('i1', 'Пункт', 0, [
        document('d1', 'application/pdf', MEGABYTE),
        document('d2', 'image/heic', 10 * MEGABYTE),
      ]),
    ]);
    const withoutUnsupported = planPackage([
      entry('i1', 'Пункт', 0, [document('d1', 'application/pdf', MEGABYTE)]),
    ]);

    expect(withUnsupported.estimatedBytes).toBe(
      withoutUnsupported.estimatedBytes,
    );
  });

  it('размер неизвестен — берётся правдоподобный, а не ноль', () => {
    // Записи Фазы 1 могли остаться без `size_bytes`; нулевая оценка
    // привела бы к сборке без проверки места.
    const plan = planPackage([
      entry('i1', 'Пункт', 0, [document('d1', 'application/pdf', null)]),
    ]);

    expect(plan.estimatedBytes).toBeGreaterThan(MEGABYTE);
  });

  it('пустой чек-лист — только реестр', () => {
    const plan = planPackage([]);

    expect(plan.estimatedBytes).toBeGreaterThan(0);
    expect(plan.itemCount).toBe(0);
  });
});

it('документы для обработки идут в порядке чек-листа', () => {
  const plan = planPackage([
    entry('i1', 'Паспорт', 0, [
      document('d1', 'image/jpeg'),
      document('d2', 'application/pdf'),
    ]),
    entry('i2', 'Справка', 1, []),
    entry('i3', 'Фото', 2, [document('d3', 'image/png')]),
  ]);

  expect(documentsToProcess(plan).map(item => item.document.id)).toEqual([
    'd1',
    'd2',
    'd3',
  ]);
});
