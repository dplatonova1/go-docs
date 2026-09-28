/**
 * Запуск приложения и переходы между экранами.
 *
 * Хранилище замокано на нашей границе (`db/client` и репозиторий), а
 * навигация — настоящая: проверяется в том числе то, что делает стек —
 * возврат к списку и замена экрана создания на чек-лист.
 *
 * Экраны стека остаются смонтированными под верхним, поэтому «список
 * заявок есть в дереве» само по себе ничего не значит — проверяется
 * верхний экран.
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

// Выбор языка лежит в файле, а файловая система — нативная.
// Мок на нашей границе: язык тестов задаёт `test-utils/setupLocale.ts`.
jest.mock('../../i18n/persistence', () => ({
  loadStoredLocale: jest.fn().mockResolvedValue(undefined),
  changeLocale: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../db/client', () => ({
  runMigrations: jest.fn(),
}));

jest.mock('../../features/checklist/repository', () => ({
  listApplications: jest.fn(),
  getLastOpenedApplication: jest.fn(),
  getApplicationById: jest.fn(),
  markApplicationOpened: jest.fn(),
  listChecklistItems: jest.fn(),
  createApplication: jest.fn(),
  deleteApplication: jest.fn(),
  getApplicationDeletionImpact: jest.fn(),
  detachDocumentFromItem: jest.fn(),
  renameApplication: jest.fn(),
  listLibraryDocuments: jest.fn(),
  getDocumentUsage: jest.fn(),
  attachLibraryDocumentToItem: jest.fn(),
}));

jest.mock('../../features/library/deleteDocumentFromLibrary', () => ({
  deleteDocumentFromLibrary: jest.fn(),
}));

// Превью в библиотеке читает и расшифровывает файл — нативные модули.
jest.mock('../../storage/fs', () => ({
  readFile: jest.fn(),
  toRelativePath: (value: string) => value,
}));

// Сборка пакета тянет pdf-lib и файловое хранилище (нативные модули).
// Её путь проверяется своими тестами; здесь нужен только экран.
jest.mock('../../features/package', () => ({
  preparePackagePlan: jest.fn(),
  buildPackage: jest.fn(),
  sharePackage: jest.fn(),
}));

jest.mock('../../features/checklist/attachDocument', () => ({
  pickAndAttachDocument: jest.fn(),
}));

const client = require('../../db/client');
const repository = require('../../features/checklist/repository');

const APPLICATION = { id: 'app-1', title: 'ВНЖ Сербия' };

beforeEach(() => {
  // Именно clear, а не reset: официальный мок safe-area-context — тоже
  // jest.fn, и `resetAllMocks` стёр бы его реализацию. Тогда
  // `useSafeAreaInsets()` вернул бы undefined, и шапка навигации упала бы
  // на `insets.top` — ошибка, не имеющая отношения к тесту.
  jest.clearAllMocks();
  client.runMigrations.mockResolvedValue(undefined);
  repository.listApplications.mockResolvedValue([]);
  repository.getLastOpenedApplication.mockResolvedValue(null);
  repository.getApplicationById.mockResolvedValue(APPLICATION);
  repository.markApplicationOpened.mockResolvedValue(undefined);
  repository.listChecklistItems.mockResolvedValue([]);
  repository.listLibraryDocuments.mockResolvedValue([]);
  repository.attachLibraryDocumentToItem.mockResolvedValue('attached');
});

afterEach(cleanup);

async function renderNavigator() {
  const tree = await render(<RootNavigator />);
  await flush();
  return tree;
}

it('заявок нет — сразу экран создания; миграции применяются до чтения', async () => {
  const tree = await renderNavigator();

  expect(exists(tree, 'create-application-screen')).toBe(true);
  expect(exists(tree, 'checklist-screen')).toBe(false);
  expect(client.runMigrations.mock.invocationCallOrder[0]).toBeLessThan(
    repository.getLastOpenedApplication.mock.invocationCallOrder[0],
  );
});

it('под экраном создания остаётся список — уйти с первого запуска есть куда', async () => {
  const tree = await renderNavigator();

  expect(exists(tree, 'application-list-screen')).toBe(true);
});

it('есть последняя открытая — сразу её чек-лист', async () => {
  repository.getLastOpenedApplication.mockResolvedValue(APPLICATION);
  repository.listApplications.mockResolvedValue([APPLICATION]);
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
  expect(repository.getApplicationById).toHaveBeenCalledWith('app-1');
  expect(repository.listChecklistItems).toHaveBeenCalledWith('app-1');
  expect(texts(tree)).toEqual(
    expect.arrayContaining(['1. Паспорт', '2. Фото']),
  );
});

it('открытая заявка отмечается открытой — от этого зависит следующий запуск', async () => {
  repository.getLastOpenedApplication.mockResolvedValue(APPLICATION);

  await renderNavigator();

  expect(repository.markApplicationOpened).toHaveBeenCalledWith('app-1');
});

it('сбой отметки «открыта» не мешает работать с чек-листом', async () => {
  repository.getLastOpenedApplication.mockResolvedValue(APPLICATION);
  repository.markApplicationOpened.mockRejectedValue(
    new StorageError(StorageErrorCode.DatabaseFailure, 'SQLITE_BUSY'),
  );

  const tree = await renderNavigator();

  expect(exists(tree, 'checklist-screen')).toBe(true);
});

it('заявка из восстановленного маршрута удалена — сообщение и путь к списку', async () => {
  repository.getLastOpenedApplication.mockResolvedValue(APPLICATION);
  repository.getApplicationById.mockResolvedValue(null);

  const tree = await renderNavigator();

  expect(exists(tree, 'application-route-missing')).toBe(true);
  expect(exists(tree, 'checklist-screen')).toBe(false);

  await press(tree, 'back-to-applications-button');
  await flush();

  expect(exists(tree, 'application-route-missing')).toBe(false);
  expect(exists(tree, 'application-list-screen')).toBe(true);
});

it('после создания заявки открывается её чек-лист', async () => {
  const tree = await renderNavigator();

  expect(exists(tree, 'create-application-screen')).toBe(true);

  await ReactTestRenderer.act(async () => {
    tree.root.findByType(CreateApplicationScreen).props.onCreated(APPLICATION);
  });
  await flush();

  expect(exists(tree, 'checklist-screen')).toBe(true);
  // Экран создания заменён, а не оставлен под чек-листом: возвращаться к
  // заполненной форме уже сохранённой заявки некуда.
  expect(exists(tree, 'create-application-screen')).toBe(false);
});

it('после сброса заявки — возврат к списку', async () => {
  repository.getLastOpenedApplication.mockResolvedValue(APPLICATION);
  const tree = await renderNavigator();

  await ReactTestRenderer.act(async () => {
    tree.root.findByType(ChecklistScreen).props.onReset();
  });
  await flush();

  expect(exists(tree, 'checklist-screen')).toBe(false);
  expect(exists(tree, 'application-list-screen')).toBe(true);
});

it('из списка открывается переименование заявки', async () => {
  repository.getLastOpenedApplication.mockResolvedValue(APPLICATION);
  repository.listApplications.mockResolvedValue([APPLICATION]);
  const tree = await renderNavigator();

  // С чек-листа — назад к списку, оттуда — в переименование.
  await ReactTestRenderer.act(async () => {
    tree.root.findByType(ChecklistScreen).props.onReset();
  });
  await flush();

  await press(tree, 'application-row-0-rename');
  await flush();

  expect(exists(tree, 'rename-application-screen')).toBe(true);
  expect(repository.getApplicationById).toHaveBeenCalledWith('app-1');
});

it('из списка открывается библиотека документов', async () => {
  repository.getLastOpenedApplication.mockResolvedValue(APPLICATION);
  repository.listApplications.mockResolvedValue([APPLICATION]);
  const tree = await renderNavigator();

  // Список под чек-листом данные не грузит, пока не получит фокус, —
  // поэтому сначала возвращаемся на него.
  await ReactTestRenderer.act(async () => {
    tree.root.findByType(ChecklistScreen).props.onReset();
  });
  await flush();

  await press(tree, 'open-document-library-button');
  await flush();

  expect(exists(tree, 'document-library-screen')).toBe(true);
  expect(repository.listLibraryDocuments).toHaveBeenCalledWith(null);
});

it('из пункта чек-листа открывается выбор файла из библиотеки', async () => {
  repository.getLastOpenedApplication.mockResolvedValue(APPLICATION);
  repository.listChecklistItems.mockResolvedValue([
    {
      id: 'i1',
      label: 'Паспорт',
      position: 0,
      status: 'pending',
      documents: [],
    },
  ]);
  const tree = await renderNavigator();

  await press(tree, 'checklist-item-0-pick-from-library');
  await flush();

  expect(exists(tree, 'document-library-screen')).toBe(true);
  // Библиотека открыта для конкретного пункта — иначе прикреплять некуда.
  expect(repository.listLibraryDocuments).toHaveBeenCalledWith('i1');
});

it('хранилище недоступно — понятная ошибка и повтор', async () => {
  const failure = new StorageError(
    StorageErrorCode.KeychainUnavailable,
    'детали для разработчика',
  );
  client.runMigrations.mockRejectedValueOnce(failure);

  const tree = await renderNavigator();

  expect(exists(tree, 'launch-failed')).toBe(true);
  expect(texts(tree)).toContain(describeError(failure));
  expect(repository.getLastOpenedApplication).not.toHaveBeenCalled();

  await press(tree, 'launch-retry-button');
  await flush();

  expect(exists(tree, 'application-list-screen')).toBe(true);
});

it('заявки есть — запуск открывает последнюю, а не экран создания', async () => {
  repository.getLastOpenedApplication.mockResolvedValue(APPLICATION);

  const tree = await renderNavigator();

  expect(exists(tree, 'checklist-screen')).toBe(true);
  expect(exists(tree, 'create-application-screen')).toBe(false);
});
