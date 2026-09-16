/**
 * @format
 *
 * Smoke-тест корневого компонента: дерево собирается, провайдеры на
 * месте, и без заявки запуск приводит на экран её создания.
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

jest.mock('../src/db/client', () => ({
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/features/checklist/repository', () => ({
  getActiveApplication: jest.fn().mockResolvedValue(null),
  listChecklistItems: jest.fn(),
  createApplication: jest.fn(),
}));

jest.mock('../src/features/checklist/attachDocument', () => ({
  pickAndAttachDocument: jest.fn(),
}));

jest.mock('../src/features/checklist/detachDocument', () => ({
  deleteAttachedDocument: jest.fn(),
}));

test('без заявки открывает экран создания', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });

  expect(
    tree.root.findAll(node => node.props.testID === 'create-application-screen')
      .length,
  ).toBeGreaterThan(0);
});
