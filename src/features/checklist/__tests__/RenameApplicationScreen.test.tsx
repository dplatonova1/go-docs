/**
 * Экран переименования заявки.
 *
 * Главное свойство: в базу уходит только непустое название, и только по
 * нажатию «Сохранить». Пустое имя заявки сделало бы строку списка
 * безымянной, а отличить такие заявки друг от друга было бы нечем.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { StorageError, StorageErrorCode } from '../../../storage/errors';
import {
  cleanup,
  exists,
  findByTestId,
  flush,
  interactiveWithoutA11y,
  press,
  render,
  typeText,
} from '../../../test-utils/render';
import { RenameApplicationScreen } from '../RenameApplicationScreen';
import type { ApplicationId } from '../model';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('../repository', () => ({
  renameApplication: jest.fn(),
}));

const repository = require('../repository');

const APPLICATION = {
  id: 'app-1' as ApplicationId,
  title: 'ВНЖ Сербия',
};

beforeEach(() => {
  jest.resetAllMocks();
  repository.renameApplication.mockResolvedValue(undefined);
});

afterEach(cleanup);

async function renderScreen() {
  const onRenamed = jest.fn();
  const onCancel = jest.fn();
  const tree = await render(
    <RenameApplicationScreen
      application={APPLICATION}
      onRenamed={onRenamed}
      onCancel={onCancel}
    />,
  );
  await flush();
  return { tree, onRenamed, onCancel };
}

it('поле заполнено текущим названием', async () => {
  const { tree } = await renderScreen();

  expect(findByTestId(tree, 'rename-application-title-input').props.value).toBe(
    'ВНЖ Сербия',
  );
});

it('сохраняет новое название и закрывает экран', async () => {
  const { tree, onRenamed } = await renderScreen();

  typeText(tree, 'rename-application-title-input', '  ВНЖ Сербия 2027  ');
  await press(tree, 'rename-application-save-button');

  // Пробелы по краям в базу не попадают: их снимает `toNonEmptyText`.
  expect(repository.renameApplication).toHaveBeenCalledWith(
    'app-1',
    'ВНЖ Сербия 2027',
  );
  expect(onRenamed).toHaveBeenCalledTimes(1);
});

it('пустое название не сохраняется, показывается ошибка', async () => {
  const { tree, onRenamed } = await renderScreen();

  typeText(tree, 'rename-application-title-input', '   ');
  await press(tree, 'rename-application-save-button');

  expect(repository.renameApplication).not.toHaveBeenCalled();
  expect(onRenamed).not.toHaveBeenCalled();
  expect(exists(tree, 'rename-application-title-input-error')).toBe(true);
});

it('название не изменилось — в базу не пишем, просто закрываемся', async () => {
  const { tree, onRenamed } = await renderScreen();

  await press(tree, 'rename-application-save-button');

  expect(repository.renameApplication).not.toHaveBeenCalled();
  expect(onRenamed).toHaveBeenCalledTimes(1);
});

it('отмена ничего не пишет', async () => {
  const { tree, onCancel, onRenamed } = await renderScreen();

  typeText(tree, 'rename-application-title-input', 'Другое название');
  await press(tree, 'rename-application-cancel-button');

  expect(repository.renameApplication).not.toHaveBeenCalled();
  expect(onRenamed).not.toHaveBeenCalled();
  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('ошибка сохранения показывается, экран остаётся, можно повторить', async () => {
  repository.renameApplication.mockRejectedValueOnce(
    new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
  );
  const { tree, onRenamed } = await renderScreen();

  typeText(tree, 'rename-application-title-input', 'Новое название');
  await press(tree, 'rename-application-save-button');

  expect(exists(tree, 'rename-application-error')).toBe(true);
  expect(onRenamed).not.toHaveBeenCalled();
  expect(
    findByTestId(tree, 'rename-application-save-button').props.disabled,
  ).toBe(false);

  await press(tree, 'rename-application-save-button');
  expect(onRenamed).toHaveBeenCalledTimes(1);
});

it('двойное нажатие сохраняет один раз', async () => {
  let finish: (value: unknown) => void = () => {};
  repository.renameApplication.mockImplementation(
    () => new Promise(resolve => (finish = resolve)),
  );
  const { tree } = await renderScreen();

  typeText(tree, 'rename-application-title-input', 'Новое название');
  // Не через `press`: сохранение не завершается, и ожидание его промиса
  // повисло бы до таймаута теста.
  const save = findByTestId(tree, 'rename-application-save-button').props
    .onPress;
  await ReactTestRenderer.act(async () => {
    save();
    save();
  });

  expect(repository.renameApplication).toHaveBeenCalledTimes(1);
  expect(
    findByTestId(tree, 'rename-application-save-button').props.disabled,
  ).toBe(true);

  await ReactTestRenderer.act(async () => {
    finish(undefined);
  });
});

it('у всего интерактивного есть accessibilityLabel и testID', async () => {
  const { tree } = await renderScreen();

  expect(interactiveWithoutA11y(tree)).toEqual([]);
});
