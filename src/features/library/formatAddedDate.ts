/**
 * Дата добавления документа для показа в библиотеке.
 *
 * Своё форматирование, а не `Intl.DateTimeFormat`: полнота ICU в Hermes
 * зависит от платформы и сборки, и месяцы могут молча оказаться не на
 * том языке, на котором идёт остальной интерфейс. Формат здесь один и
 * тот же везде, и его видно в тестах.
 *
 * Названия месяцев и порядок частей даты берутся из словаря текущего
 * языка ([`src/i18n`](../../i18n)): в русском месяц стоит в родительном
 * падеже («12 марта 2026»), и подставить его в чужой шаблон нельзя.
 */

import { translations } from '../../i18n';

/**
 * @param isoDate значение `documents.created_at` — ISO-строка в UTC.
 * @returns «12 марта 2026» в местном часовом поясе устройства.
 */
export function formatAddedDate(isoDate: string): string {
  const t = translations().date;
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return t.unknown;
  }

  const month = t.months[date.getMonth()];
  if (month === undefined) {
    return t.unknown;
  }

  return t.format(date.getDate(), month, date.getFullYear());
}
