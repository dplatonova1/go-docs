/**
 * Текущий язык приложения.
 *
 * Один изменяемый модуль вместо React-контекста, потому что переводы
 * нужны не только компонентам: подтверждения, сообщения об ошибках,
 * реестр внутри PDF и форматирование дат — чистые модули, и хук им не
 * вызвать. Контекст пришлось бы дублировать параметром через все
 * сигнатуры.
 *
 * Компоненты всё равно перерисовываются при смене языка: `useTranslation`
 * подписывается здесь через `useSyncExternalStore`. Именно поэтому
 * мемоизированные строки списков берут тексты хуком, а не пропсами —
 * иначе `memo` не пустил бы к ним новый язык.
 *
 * Начальное значение — язык системы. Выбор пользователя лежит в файле и
 * доезжает при запуске ([`persistence.ts`](./persistence.ts)).
 *
 * Модуль намеренно синхронный и без зависимостей от хранилища: его можно
 * звать из любого места и проверять в тестах без моков нативного слоя.
 */

import { FALLBACK_LOCALE, MESSAGES } from './constants';
import { detectSystemLocale } from './systemLocale';
import type { Locale, Messages } from './types';

let current: Locale = detectSystemLocale() ?? FALLBACK_LOCALE;

const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

/**
 * Словарь текущего языка — для чистых модулей вне React.
 *
 * Вызывать в момент, когда строка нужна, а не при загрузке модуля:
 * значение, снятое на верхнем уровне, останется на старом языке
 * навсегда.
 */
export function translations(): Messages {
  return MESSAGES[current];
}

/**
 * Меняет язык на месте. Сохранение выбора — отдельно, в
 * [`persistence.ts`](./persistence.ts).
 */
export function setLocale(locale: Locale): void {
  if (locale === current) {
    return;
  }

  current = locale;

  for (const listener of listeners) {
    listener();
  }
}

/** Подписка для `useSyncExternalStore`. Возвращает отписку. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
