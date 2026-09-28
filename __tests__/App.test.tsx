/**
 * @format
 *
 * Smoke-тест корневого компонента: дерево собирается, провайдеры на
 * месте, и без заявок запуск приводит сразу на создание заявки.
 *
 * Хранилище заменено заглушками на нашей границе (db/client и
 * репозиторий), а не на уровне нативных библиотек: работа хранилища
 * проверяется своими тестами и вручную на устройстве. Развилки запуска
 * подробно — в src/navigation/__tests__/RootNavigator.test.tsx.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

// Выбор языка лежит в файле, а файловая система — нативная.
// Мок на нашей границе: язык тестов задаёт `test-utils/setupLocale.ts`.
jest.mock('../src/i18n/persistence', () => ({
  loadStoredLocale: jest.fn().mockResolvedValue(undefined),
  changeLocale: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/db/client', () => ({
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/features/checklist/repository', () => ({
  listApplications: jest.fn().mockResolvedValue([]),
  getLastOpenedApplication: jest.fn().mockResolvedValue(null),
  getApplicationById: jest.fn(),
  markApplicationOpened: jest.fn(),
  listChecklistItems: jest.fn(),
  createApplication: jest.fn(),
  deleteApplication: jest.fn(),
  getApplicationDeletionImpact: jest.fn(),
  detachDocumentFromItem: jest.fn(),
  renameApplication: jest.fn(),
  listLibraryDocuments: jest.fn().mockResolvedValue([]),
  getDocumentUsage: jest.fn(),
  attachLibraryDocumentToItem: jest.fn(),
}));

jest.mock('../src/features/library/deleteDocumentFromLibrary', () => ({
  deleteDocumentFromLibrary: jest.fn(),
}));

// Библиотека документов тянет файловое хранилище ради превью, а оно —
// нативные модули (Keychain, CSPRNG). Здесь проверяется только сборка
// дерева.
jest.mock('../src/storage/fs', () => ({
  readFile: jest.fn(),
  toRelativePath: (value: string) => value,
}));

// Сборка пакета тянет pdf-lib и файловое хранилище (нативные модули).
// Её путь проверяется своими тестами; здесь нужен только экран.
jest.mock('../src/features/package', () => ({
  preparePackagePlan: jest.fn(),
  buildPackage: jest.fn(),
  sharePackage: jest.fn(),
}));

jest.mock('../src/features/checklist/attachDocument', () => ({
  pickAndAttachDocument: jest.fn(),
}));

test('без заявок открывает создание заявки', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });

  expect(
    tree.root.findAll(
      node => node.props.testID === 'create-application-screen',
    ).length,
  ).toBeGreaterThan(0);
});
