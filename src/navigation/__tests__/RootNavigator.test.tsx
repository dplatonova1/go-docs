/**
 * Логика запуска Фазы 1: заявка есть — сразу её чек-лист, заявки нет —
 * экран создания. Хранилище замокано на нашей границе.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { ChecklistScreen } from '../../features/checklist/ChecklistScreen';
import { CreateApplicationScreen } from '../../features/checklist/CreateApplicationScreen';
import { describeError } from '../../features/checklist/errorMessages';
import { StorageError, StorageErrorCode } from '../../storage/errors';
import {
  cleanup,
  exists,
  flush,
  press,
  render,
  texts,
} from '../../test-utils/render';
import { RootNavigator } from '../RootNavigator';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('../../db/client', () => ({
  runMigrations: jest.fn(),
}));

jest.mock('../../features/checklist/repository', () => ({
  getActiveApplication: jest.fn(),
  listChecklistItems: jest.fn(),
  createApplication: jest.fn(),
}));

jest.mock('../../features/checklist/attachDocument', () => ({
  pickAndAttachDocument: jest.fn(),
}));

jest.mock('../../features/checklist/detachDocument', () => ({
  deleteAttachedDocument: jest.fn(),
}));

const client = require('../../db/client');
const repository = require('../../features/checklist/repository');

const APPLICATION = { id: 'app-1', title: 'ВНЖ Сербия' };

beforeEach(() => {
  jest.resetAllMocks();
  client.runMigrations.mockResolvedValue(undefined);
  repository.listChecklistItems.mockResolvedValue([]);
});

afterEach(cleanup);

async function renderNavigator() {
  const tree = await render(<RootNavigator />);
  await flush();
  return tree;
}

it('заявки нет — экран создания; миграции применяются до чтения', async () => {
  repository.getActiveApplication.mockResolvedValue(null);

  const tree = await renderNavigator();

  expect(exists(tree, 'create-application-screen')).toBe(true);
  expect(exists(tree, 'checklist-screen')).toBe(false);
  expect(client.runMigrations.mock.invocationCallOrder[0]).toBeLessThan(
    repository.getActiveApplication.mock.invocationCallOrder[0],
  );
});

it('заявка есть — сразу её чек-лист, без экрана создания', async () => {
  repository.getActiveApplication.mockResolvedValue(APPLICATION);
  repository.listChecklistItems.mockResolvedValue([
    {
      id: 'i1',
      label: 'Паспорт',
      position: 0,
      status: 'pending',
      documents: [],
    },
    { id: 'i2', label: 'Фото', position: 1, status: 'pending', documents: [] },
  ]);

  const tree = await renderNavigator();

  expect(exists(tree, 'checklist-screen')).toBe(true);
  expect(exists(tree, 'create-application-screen')).toBe(false);
  expect(repository.listChecklistItems).toHaveBeenCalledWith('app-1');
  expect(texts(tree)).toEqual(
    expect.arrayContaining(['ВНЖ Сербия', '1. Паспорт', '2. Фото']),
  );
});

it('после создания заявки открывается её чек-лист', async () => {
  repository.getActiveApplication.mockResolvedValue(null);
  const tree = await renderNavigator();

  await ReactTestRenderer.act(async () => {
    tree.root.findByType(CreateApplicationScreen).props.onCreated(APPLICATION);
  });
  await flush();

  expect(exists(tree, 'checklist-screen')).toBe(true);
  expect(exists(tree, 'create-application-screen')).toBe(false);
});

it('хранилище недоступно — понятная ошибка и повтор', async () => {
  const failure = new StorageError(
    StorageErrorCode.KeychainUnavailable,
    'детали для разработчика',
  );
  client.runMigrations.mockRejectedValueOnce(failure);
  repository.getActiveApplication.mockResolvedValue(null);

  const tree = await renderNavigator();

  expect(exists(tree, 'launch-failed')).toBe(true);
  expect(texts(tree)).toContain(describeError(failure));
  expect(repository.getActiveApplication).not.toHaveBeenCalled();

  await press(tree, 'launch-retry-button');
  await flush();

  expect(exists(tree, 'create-application-screen')).toBe(true);
});

it('после сброса заявки — снова экран создания', async () => {
  repository.getActiveApplication.mockResolvedValue(APPLICATION);
  const tree = await renderNavigator();

  await ReactTestRenderer.act(async () => {
    tree.root.findByType(ChecklistScreen).props.onReset();
  });

  expect(exists(tree, 'create-application-screen')).toBe(true);
  expect(exists(tree, 'checklist-screen')).toBe(false);
});
