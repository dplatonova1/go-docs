/**
 * Экран настроек: переключение языка и темы.
 *
 * Главное свойство — экран перерисовывается на новом языке сразу, без
 * повторного открытия: ради этого `useTranslation` подписан на стор
 * ([ADR-0021](../../../../docs/adr/0021-runtime-localization.md)).
 *
 * Запись выбора замокана на нашей границе (`i18n/persistence`), а не на
 * уровне файловой системы: сам файл настроек проверяет
 * `storage/__tests__/settings.test.ts`.
 */

import React from 'react';

import { GradientRing } from '../../../components/GradientRing';
import { StorageError, StorageErrorCode } from '../../../storage/errors';
import { getLocale, setLocale } from '../../../i18n';
import {
  cleanup,
  exists,
  findByTestId,
  flush,
  interactiveWithoutA11y,
  press,
  render,
  texts,
} from '../../../test-utils/render';
import { SettingsScreen } from '../SettingsScreen';
import { TEST_IDS } from '../SettingsScreen/constants';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('../../../i18n/persistence', () => ({
  // Настоящий `changeLocale` меняет язык и пишет файл; здесь остаётся
  // только первое — вторым занимается свой тест.
  changeLocale: jest.fn(),
}));

// Настоящий модуль темы зовёт нативный `Appearance` и пишет файл; его
// проверяет `theme/__tests__/themeMode.test.ts`.
jest.mock('../../../theme/themeMode', () => ({
  THEME_MODES: ['system', 'light', 'dark'],
  getThemeMode: jest.fn(),
  changeThemeMode: jest.fn(),
}));

const persistence = require('../../../i18n/persistence');
const themeMode = require('../../../theme/themeMode');

const RU = 'settings-locale-ru';
const EN = 'settings-locale-en';

beforeEach(() => {
  jest.resetAllMocks();
  persistence.changeLocale.mockImplementation(async (locale: 'ru' | 'en') => {
    setLocale(locale);
  });
  themeMode.getThemeMode.mockReturnValue('system');
  themeMode.changeThemeMode.mockResolvedValue(undefined);
});

afterEach(cleanup);

async function renderScreen() {
  const tree = await render(<SettingsScreen />);
  await flush();
  return tree;
}

it('оба языка показаны своими названиями', async () => {
  const tree = await renderScreen();

  expect(texts(tree)).toContain('Русский');
  expect(texts(tree)).toContain('English');
});

it('выбранный язык отмечен и текстом, и состоянием', async () => {
  const tree = await renderScreen();

  // Не только цветом рамки: цвет не различат люди с нарушением
  // цветовосприятия, а состояние — то, что прочтёт скринридер.
  expect(findByTestId(tree, RU).props.accessibilityState).toEqual({
    checked: true,
  });
  expect(findByTestId(tree, EN).props.accessibilityState).toEqual({
    checked: false,
  });
  expect(texts(tree)).toContain('Выбран');
});

it('нажатие переключает язык и перерисовывает экран', async () => {
  const tree = await renderScreen();

  expect(texts(tree)).toContain('Язык');

  await press(tree, EN);
  await flush();

  expect(persistence.changeLocale).toHaveBeenCalledWith('en');
  expect(getLocale()).toBe('en');
  // Экран уже на новом языке, без повторного открытия.
  expect(texts(tree)).toContain('Language');
  expect(texts(tree)).not.toContain('Язык');
  expect(findByTestId(tree, EN).props.accessibilityState).toEqual({
    checked: true,
  });
});

it('повторное нажатие на уже выбранный язык ничего не делает', async () => {
  const tree = await renderScreen();

  await press(tree, RU);
  await flush();

  expect(persistence.changeLocale).not.toHaveBeenCalled();
});

it('неудачная запись выбора показывает ошибку', async () => {
  // Язык при этом остаётся переключённым: интерфейс обязан ответить на
  // нажатие, а сообщение говорит лишь, что выбор не переживёт перезапуск.
  persistence.changeLocale.mockImplementation(async (locale: 'ru' | 'en') => {
    setLocale(locale);
    throw new StorageError(StorageErrorCode.NotEnoughSpace, 'место кончилось');
  });

  const tree = await renderScreen();
  await press(tree, EN);
  await flush();

  expect(getLocale()).toBe('en');
  expect(exists(tree, TEST_IDS.saveError)).toBe(true);
  expect(findByTestId(tree, TEST_IDS.saveError).props.accessibilityRole).toBe(
    'alert',
  );
});

it('у каждого интерактивного элемента есть подпись и testID', async () => {
  const tree = await renderScreen();

  expect(interactiveWithoutA11y(tree)).toEqual([]);
});

describe('тема', () => {
  it('три варианта, по умолчанию — как в системе', async () => {
    const tree = await renderScreen();

    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Как в системе', 'Светлая', 'Тёмная']),
    );
    expect(
      findByTestId(tree, 'settings-theme-system').props.accessibilityState,
    ).toEqual({ checked: true });
  });

  it('нажатие применяет тему и отмечает выбор', async () => {
    const tree = await renderScreen();

    await press(tree, 'settings-theme-dark');
    await flush();

    expect(themeMode.changeThemeMode).toHaveBeenCalledWith('dark');
    expect(
      findByTestId(tree, 'settings-theme-dark').props.accessibilityState,
    ).toEqual({ checked: true });
    expect(
      findByTestId(tree, 'settings-theme-system').props.accessibilityState,
    ).toEqual({ checked: false });
  });

  it('неудачная запись выбора темы показывает ошибку', async () => {
    themeMode.changeThemeMode.mockRejectedValue(
      new StorageError(StorageErrorCode.NotEnoughSpace, 'disk full'),
    );
    const tree = await renderScreen();

    await press(tree, 'settings-theme-light');
    await flush();

    expect(exists(tree, TEST_IDS.themeSaveError)).toBe(true);
  });
});

describe('рамка выбранного варианта', () => {
  it('градиентная рамка — только у выбранного языка', async () => {
    setLocale('ru');
    const tree = await render(<SettingsScreen />);
    await flush();

    expect(findByTestId(tree, RU).findAllByType(GradientRing)).toHaveLength(1);
    expect(findByTestId(tree, EN).findAllByType(GradientRing)).toHaveLength(0);
  });
});
