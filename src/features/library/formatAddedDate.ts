/**
 * Дата добавления документа для показа в библиотеке.
 *
 * Своё форматирование, а не `Intl.DateTimeFormat`: полнота ICU в Hermes
 * зависит от платформы и сборки, и русские месяцы могут молча
 * превратиться в английские. Формат здесь один и тот же везде, и его
 * видно в тестах.
 *
 * Месяцы — в родительном падеже: строка читается как «12 марта 2026»,
 * а не «12 март 2026».
 */

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

/** Показывается, если в базе оказалась строка, которую не разобрать. */
export const UNKNOWN_DATE = 'дата неизвестна';

/**
 * @param isoDate значение `documents.created_at` — ISO-строка в UTC.
 * @returns «12 марта 2026» в местном часовом поясе устройства.
 */
export function formatAddedDate(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return UNKNOWN_DATE;
  }

  const month = MONTHS[date.getMonth()];
  if (month === undefined) {
    return UNKNOWN_DATE;
  }

  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}
