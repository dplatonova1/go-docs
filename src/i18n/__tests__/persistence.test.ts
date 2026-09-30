/**
 * Сохранённый выбор языка.
 *
 * Хранилище замокано на нашей границе (`storage/settings`), а не на
 * уровне нативной файловой системы: работу самого файла настроек
 * проверяет `storage/__tests__/settings.test.ts`.
 */

import { getLocale, setLocale } from '../store';

jest.mock('../../storage/settings', () => ({
  readSettings: jest.fn(),
  writeSetting: jest.fn(),
}));

const settings = require('../../storage/settings');

const { changeLocale, loadStoredLocale } =
  require('../persistence') as typeof import('../persistence');

beforeEach(() => {
  jest.clearAllMocks();
  setLocale('ru');
});

it('сохранённый выбор применяется при запуске', async () => {
  settings.readSettings.mockResolvedValue({ locale: 'en' });

  await loadStoredLocale();

  expect(getLocale()).toBe('en');
});

it('без сохранённого выбора язык остаётся прежним', async () => {
  settings.readSettings.mockResolvedValue({});

  await loadStoredLocale();

  expect(getLocale()).toBe('ru');
});

it('мусор вместо языка не применяется', async () => {
  // Файл настроек не зашифрован, и его могли поправить руками; язык
  // могли и убрать из сборки.
  settings.readSettings.mockResolvedValue({ locale: 'de' });

  await loadStoredLocale();

  expect(getLocale()).toBe('ru');
});

it('выбор пользователя применяется и записывается', async () => {
  settings.readSettings.mockResolvedValue({});
  settings.writeSetting.mockResolvedValue(undefined);

  await changeLocale('en');

  expect(getLocale()).toBe('en');
  expect(settings.writeSetting).toHaveBeenCalledWith('locale', 'en');
});

it('язык переключается, даже если записать его не удалось', async () => {
  // Интерфейс обязан ответить на нажатие: выбор остаётся, а о том, что
  // он не переживёт перезапуск, скажет экран по этой ошибке.
  settings.writeSetting.mockRejectedValue(new Error('диск занят'));

  await expect(changeLocale('en')).rejects.toThrow();
  expect(getLocale()).toBe('en');
});
