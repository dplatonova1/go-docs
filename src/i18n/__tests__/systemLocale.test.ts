/**
 * Разбор языкового тега системы.
 *
 * Официального API для языка устройства в React Native нет, поэтому сюда
 * приходит что угодно: `ru_RU` с Android, `ru-RU` или `en` с iOS, а на
 * незнакомой сборке — `undefined`. Ошибиться здесь не страшно, упасть
 * при старте — страшно.
 */

import { toLocale } from '../systemLocale';

it('регион и письменность на выбор языка не влияют', () => {
  expect(toLocale('ru')).toBe('ru');
  expect(toLocale('ru_RU')).toBe('ru');
  expect(toLocale('ru-RU')).toBe('ru');
  expect(toLocale('RU')).toBe('ru');
  expect(toLocale('en-GB')).toBe('en');
});

it('неподдерживаемый язык — не язык приложения', () => {
  expect(toLocale('sr-Latn-RS')).toBeNull();
  expect(toLocale('de')).toBeNull();
});

it('нестроку и мусор разбирать не пытается', () => {
  expect(toLocale(undefined)).toBeNull();
  expect(toLocale(null)).toBeNull();
  expect(toLocale('')).toBeNull();
  expect(toLocale(42)).toBeNull();
  expect(toLocale({})).toBeNull();
});
