/**
 * Экран списка заявок.
 *
 * Порядок строк задаёт репозиторий (недавно открытые сверху) — экран его
 * не пересортировывает, и это здесь проверяется: иначе «последняя
 * открытая» из ADR-0015 разъедется между списком и запуском.
 */

import React from 'react';

import { StorageError, StorageErrorCode } from '../../../storage/errors';
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
import { ApplicationListScreen } from '../ApplicationListScreen';
import type { ApplicationId } from '../model';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('../repository', () => ({
  listApplications: jest.fn(),
}));

const repository = require('../repository');

const APPLICATIONS = [
  { id: 'app-2' as ApplicationId, title: 'ПМЖ Сербия' },
  { id: 'app-1' as ApplicationId, title: 'ВНЖ Сербия' },
];

beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(cleanup);

type Handlers = {
  onOpen?: jest.Mock;
  onCreate?: jest.Mock;
  isFocused?: boolean;
};

async function renderScreen({
  onOpen = jest.fn(),
  onCreate = jest.fn(),
  isFocused = true,
}: Handlers = {}) {
  const tree = await render(
    <ApplicationListScreen
      isFocused={isFocused}
      onOpen={onOpen}
      onCreate={onCreate}
    />,
  );
  await flush();
  return { tree, onOpen, onCreate };
}

it('показывает заявки в порядке репозитория', async () => {
  repository.listApplications.mockResolvedValue(APPLICATIONS);

  const { tree } = await renderScreen();

  expect(texts(tree)).toEqual(
    expect.arrayContaining(['ПМЖ Сербия', 'ВНЖ Сербия']),
  );
  expect(findByTestId(tree, 'application-row-0').props.accessibilityLabel).toBe(
    'Заявка 1 из 2: ПМЖ Сербия. Открыть чек-лист',
  );
  expect(exists(tree, 'application-list-empty')).toBe(false);
});

it('без заявок — подсказка, с чего начать, и кнопка создания', async () => {
  repository.listApplications.mockResolvedValue([]);

  const { tree } = await renderScreen();

  expect(exists(tree, 'application-list-empty')).toBe(true);
  expect(exists(tree, 'create-application-button')).toBe(true);
  expect(exists(tree, 'application-list-error')).toBe(false);
});

it('нажатие на строку открывает именно её заявку', async () => {
  repository.listApplications.mockResolvedValue(APPLICATIONS);

  const { tree, onOpen } = await renderScreen();
  await press(tree, 'application-row-1');

  expect(onOpen).toHaveBeenCalledWith(APPLICATIONS[1]);
});

it('кнопка создания зовёт onCreate', async () => {
  repository.listApplications.mockResolvedValue([]);

  const { tree, onCreate } = await renderScreen();
  await press(tree, 'create-application-button');

  expect(onCreate).toHaveBeenCalledTimes(1);
});

it('сбой чтения — сообщение и повтор, а не пустой список', async () => {
  repository.listApplications.mockRejectedValueOnce(
    new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
  );
  repository.listApplications.mockResolvedValue(APPLICATIONS);

  const { tree } = await renderScreen();

  expect(exists(tree, 'application-list-error')).toBe(true);
  expect(texts(tree)).not.toContain('детали');

  await press(tree, 'application-list-retry-button');
  await flush();

  expect(exists(tree, 'application-list-error')).toBe(false);
  expect(texts(tree)).toEqual(expect.arrayContaining(['ПМЖ Сербия']));
});

it('без фокуса не читает список: экран под другим не должен грузить данные', async () => {
  repository.listApplications.mockResolvedValue(APPLICATIONS);

  await renderScreen({ isFocused: false });

  expect(repository.listApplications).not.toHaveBeenCalled();
});

it('у всего интерактивного есть accessibilityLabel и testID', async () => {
  repository.listApplications.mockResolvedValue(APPLICATIONS);

  const { tree } = await renderScreen();

  expect(interactiveWithoutA11y(tree)).toEqual([]);
});
