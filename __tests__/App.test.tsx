/**
 * @format
 *
 * Smoke-тест корневого компонента: проверяет, что дерево собирается и
 * ничего не падает на импортах.
 *
 * Нативные обёртки заменены заглушками на нашей границе (db/client,
 * storage/keychain, storage/fs), а не на уровне библиотек: тесту важно,
 * что экран рендерится, а работа хранилища проверяется своими тестами и
 * вручную на устройстве.
 *
 * TODO: remove before Phase 1 — вместе с временным экраном
 * src/features/dev отсюда уйдут и эти заглушки.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('../src/db/client', () => ({
  getDb: jest.fn(),
  runMigrations: jest.fn(),
}));

jest.mock('../src/storage/keychain', () => ({
  getOrCreateEncryptionKey: jest.fn(),
}));

jest.mock('../src/storage/fs', () => ({
  // toRelativePath вызывается на уровне модуля, поэтому заглушка обязана
  // вернуть строку, а не undefined.
  toRelativePath: (value: string) => value,
  saveFile: jest.fn(),
  readFile: jest.fn(),
  deleteFile: jest.fn(),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
