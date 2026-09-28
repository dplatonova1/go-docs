/**
 * Словари сходятся между собой.
 *
 * Набор ключей сторожит tsc: `en` объявлен как `Messages`, выведенный из
 * `ru`. Но тип не ловит того, что видно только в рантайме, — пустую
 * строку вместо перевода, функцию, забывшую подставить аргумент, или
 * месяц, потерявшийся при копировании списка. Эти тесты про такое.
 *
 * Проход общий для всех языков: добавится третий — он проверится сам.
 */

import { MESSAGES } from '../constants';
import type { Locale } from '../types';

const LOCALES = Object.keys(MESSAGES) as readonly Locale[];

type Entry = {
  readonly path: string;
  readonly value: unknown;
};

/** Разворачивает словарь в плоский список «путь → значение». */
function flatten(value: unknown, path = ''): readonly Entry[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flatten(item, `${path}[${index}]`));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, nested]) =>
      flatten(nested, path === '' ? key : `${path}.${key}`),
    );
  }

  return [{ path, value }];
}

describe.each(LOCALES)('словарь «%s»', locale => {
  const entries = flatten(MESSAGES[locale]);

  it('ни одна строка не пустая', () => {
    const empty = entries
      .filter(
        entry => typeof entry.value === 'string' && entry.value.trim() === '',
      )
      .map(entry => entry.path);

    expect(empty).toEqual([]);
  });

  it('двенадцать месяцев', () => {
    expect(MESSAGES[locale].date.months).toHaveLength(12);
  });
});

it('у всех языков одинаковые ключи и одинаковая форма значений', () => {
  const shapeOf = (locale: Locale) =>
    flatten(MESSAGES[locale]).map(entry => ({
      path: entry.path,
      kind: typeof entry.value,
      // Число аргументов: подстановка, потерянная при переводе, иначе
      // молча выбросила бы часть текста.
      arity: typeof entry.value === 'function' ? entry.value.length : 0,
    }));

  const [first, ...rest] = LOCALES;

  for (const locale of rest) {
    expect(shapeOf(locale)).toEqual(shapeOf(first as Locale));
  }
});

it('подстановки доходят до текста', () => {
  // Взят один представитель каждого вида подстановки: число, строка и
  // несколько аргументов сразу.
  for (const locale of LOCALES) {
    const t = MESSAGES[locale];

    expect(t.checklist.summary(7)).toContain('7');
    expect(t.confirmations.detachTitle('скан.pdf')).toContain('скан.pdf');
    expect(t.checklistItem.labelA11y(2, 5, 'Паспорт')).toContain('Паспорт');
    expect(t.errors.storage['file-too-large'](5)).toContain('5');
  }
});
