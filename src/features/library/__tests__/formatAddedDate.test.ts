/**
 * Форматирование даты добавления.
 *
 * Проверяется без `Intl`: месяцы должны быть русскими на любой сборке
 * Hermes, а не только на той, где ICU полный. Язык тестов — русский, его
 * задаёт `test-utils/setupLocale.ts`; отдельно проверяется, что месяцы
 * следуют за выбранным языком.
 */

import { setLocale, translations } from '../../../i18n';
import { formatAddedDate } from '../formatAddedDate';

it('месяц в родительном падеже, день без ведущего нуля', () => {
  // Время задано так, чтобы дата не менялась при сдвиге часового пояса
  // тестовой машины на несколько часов в любую сторону.
  expect(formatAddedDate('2026-03-12T12:00:00.000Z')).toBe('12 марта 2026');
  expect(formatAddedDate('2026-09-01T12:00:00.000Z')).toBe('1 сентября 2026');
});

it('все двенадцать месяцев подписаны', () => {
  const months = Array.from({ length: 12 }, (_, index) =>
    formatAddedDate(
      `2026-${String(index + 1).padStart(2, '0')}-15T12:00:00.000Z`,
    ),
  );

  expect(months).toEqual([
    '15 января 2026',
    '15 февраля 2026',
    '15 марта 2026',
    '15 апреля 2026',
    '15 мая 2026',
    '15 июня 2026',
    '15 июля 2026',
    '15 августа 2026',
    '15 сентября 2026',
    '15 октября 2026',
    '15 ноября 2026',
    '15 декабря 2026',
  ]);
});

it('мусор в базе не ломает строку списка', () => {
  // Строка приходит из БД: испорченная запись не должна давать
  // «Invalid Date» в интерфейсе.
  expect(formatAddedDate('не дата')).toBe(translations().date.unknown);
  expect(formatAddedDate('')).toBe(translations().date.unknown);
});

it('месяцы следуют за выбранным языком', () => {
  setLocale('en');

  expect(formatAddedDate('2026-03-12T12:00:00.000Z')).toBe('12 March 2026');
  expect(formatAddedDate('не дата')).toBe('date unknown');
});
