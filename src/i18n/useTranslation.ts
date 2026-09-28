/**
 * Тексты текущего языка для компонента.
 *
 * Подписывается на стор, поэтому компонент перерисовывается при смене
 * языка сам — провайдер над деревом не нужен, и в тестах экраны не надо
 * ничем оборачивать.
 *
 * Это же снимает главную ловушку мемоизированных списков: строка под
 * `memo` с теми же пропсами не перерисовалась бы от родителя, но
 * подписку она держит свою и язык получает.
 *
 * Снимок — объект словаря, константа модуля: ссылка на язык одна и та
 * же между рендерами, и `useSyncExternalStore` не уходит в цикл.
 */

import { useSyncExternalStore } from 'react';

import { subscribe, translations } from './store';
import type { Messages } from './types';

export function useTranslation(): Messages {
  return useSyncExternalStore(subscribe, translations, translations);
}
