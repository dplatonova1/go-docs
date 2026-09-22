/**
 * Сводка замечаний о качестве снимков.
 *
 * Текст должен называть конкретные пункты: «что-то в пакете размыто» без
 * указания, что именно, заставит открывать PDF и сверять вручную — то
 * есть ровно то, ради чего сводка и делалась.
 */

import { qualityWarning } from '../qualitySummary';
import type { RegistryRow } from '../types';

function row(overrides: Partial<RegistryRow> = {}): RegistryRow {
  return {
    itemNumber: 1,
    itemLabel: 'Паспорт',
    fileName: 'Паспорт.jpg',
    status: 'included',
    pageCount: 1,
    quality: null,
    ...overrides,
  };
}

it('замечаний нет — сообщения тоже нет', () => {
  expect(qualityWarning([row(), row({ itemNumber: 2 })])).toBeNull();
});

it('пустой реестр не считается поводом для тревоги', () => {
  expect(qualityWarning([])).toBeNull();
});

it('называет пункт, его имя и характер замечания', () => {
  const text = qualityWarning([
    row({ itemNumber: 4, itemLabel: 'Фото 3×4', quality: 'blurry' }),
  ]);

  expect(text).toContain('Снимки с замечаниями (1)');
  expect(text).toContain('пункт 4 «Фото 3×4» — возможно, размыт');
  expect(text).toContain('перед печатью');
});

it('различает размытый и тёмный', () => {
  const text = qualityWarning([
    row({ itemNumber: 1, quality: 'blurry' }),
    row({ itemNumber: 2, itemLabel: 'Скан', quality: 'dark' }),
  ]);

  expect(text).toContain('возможно, размыт');
  expect(text).toContain('возможно, тёмный');
  expect(text).toContain('(2)');
});

it('длинный список сворачивается, но общее число остаётся точным', () => {
  const text = qualityWarning(
    Array.from({ length: 5 }, (_, index) =>
      row({ itemNumber: index + 1, quality: 'blurry' }),
    ),
  );

  expect(text).toContain('(5)');
  expect(text).toContain('пункт 3');
  // Четвёртый и пятый — уже за пределом перечисления.
  expect(text).not.toContain('пункт 4');
  expect(text).toContain('и ещё (2)');
});

it('строки без снимков в сводку не попадают', () => {
  // Пункт без файла и невстроенный формат — это не «плохое фото».
  const text = qualityWarning([
    row({ itemNumber: 1, status: 'no-file', fileName: null }),
    row({ itemNumber: 2, status: 'not-included' }),
    row({ itemNumber: 3, quality: 'dark' }),
  ]);

  expect(text).toContain('(1)');
  expect(text).toContain('пункт 3');
});
