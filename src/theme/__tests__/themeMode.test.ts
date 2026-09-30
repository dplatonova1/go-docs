/**
 * Выбор темы: что уходит в `Appearance` и что — в файл настроек.
 *
 * Файл настроек замокан на нашей границе (`storage/settings`), а
 * `Appearance.setColorScheme` — шпион: в jest нативного модуля нет.
 */

import { Appearance } from 'react-native';

jest.mock('../../storage/settings', () => ({
  readSettings: jest.fn(),
  writeSetting: jest.fn(),
}));

const settings = require('../../storage/settings');

// Модуль держит текущий выбор в своей переменной — каждый тест берёт
// свежую копию.
function loadModule(): typeof import('../themeMode') {
  let module!: typeof import('../themeMode');
  jest.isolateModules(() => {
    module = require('../themeMode');
  });
  return module;
}

let setColorScheme: jest.SpyInstance;

beforeEach(() => {
  jest.resetAllMocks();
  setColorScheme = jest
    .spyOn(Appearance, 'setColorScheme')
    .mockImplementation(() => {});
  settings.readSettings.mockResolvedValue({});
  settings.writeSetting.mockResolvedValue(undefined);
});

it('без сохранённого выбора — тема системы, Appearance не трогается', async () => {
  const { loadStoredThemeMode, getThemeMode } = loadModule();

  await loadStoredThemeMode();

  expect(getThemeMode()).toBe('system');
  expect(setColorScheme).not.toHaveBeenCalled();
});

it('сохранённая тёмная тема применяется при запуске', async () => {
  settings.readSettings.mockResolvedValue({ themeMode: 'dark' });
  const { loadStoredThemeMode, getThemeMode } = loadModule();

  await loadStoredThemeMode();

  expect(getThemeMode()).toBe('dark');
  expect(setColorScheme).toHaveBeenCalledWith('dark');
});

it('испорченное значение в файле читается как «выбора нет»', async () => {
  settings.readSettings.mockResolvedValue({ themeMode: 'sepia' });
  const { loadStoredThemeMode, getThemeMode } = loadModule();

  await loadStoredThemeMode();

  expect(getThemeMode()).toBe('system');
  expect(setColorScheme).not.toHaveBeenCalled();
});

it('«как в системе» снимает переопределение и сохраняется', async () => {
  const { changeThemeMode } = loadModule();

  await changeThemeMode('system');

  expect(setColorScheme).toHaveBeenCalledWith('unspecified');
  expect(settings.writeSetting).toHaveBeenCalledWith('themeMode', 'system');
});

it('тема применяется до записи: неудача записи её не откатывает', async () => {
  settings.writeSetting.mockRejectedValue(new Error('disk full'));
  const { changeThemeMode, getThemeMode } = loadModule();

  await expect(changeThemeMode('light')).rejects.toThrow('disk full');

  expect(setColorScheme).toHaveBeenCalledWith('light');
  expect(getThemeMode()).toBe('light');
});
