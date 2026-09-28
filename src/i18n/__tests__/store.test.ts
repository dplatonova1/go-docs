/**
 * Текущий язык: переключение и подписка.
 *
 * Подписка — то, чем живёт `useTranslation`: без уведомления экраны
 * остались бы на старом языке до следующего рендера по другой причине.
 */

import { MESSAGES } from '../constants';
import { getLocale, setLocale, subscribe, translations } from '../store';

it('переключение меняет и язык, и словарь', () => {
  setLocale('en');

  expect(getLocale()).toBe('en');
  expect(translations()).toBe(MESSAGES.en);

  setLocale('ru');

  expect(getLocale()).toBe('ru');
  expect(translations()).toBe(MESSAGES.ru);
});

it('словарь одного языка — та же ссылка', () => {
  // На неё опирается `useSyncExternalStore`: новый объект на каждый
  // вызов снимка увёл бы его в бесконечный рендер.
  expect(translations()).toBe(translations());
});

it('подписчик узнаёт о смене языка', () => {
  const listener = jest.fn();
  const unsubscribe = subscribe(listener);

  setLocale('en');
  expect(listener).toHaveBeenCalledTimes(1);

  unsubscribe();
  setLocale('ru');
  expect(listener).toHaveBeenCalledTimes(1);
});

it('выбор того же языка никого не будит', () => {
  const listener = jest.fn();
  const unsubscribe = subscribe(listener);

  setLocale(getLocale());

  expect(listener).not.toHaveBeenCalled();
  unsubscribe();
});
