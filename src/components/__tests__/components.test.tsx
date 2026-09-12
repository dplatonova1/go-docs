/**
 * Smoke-тесты базовых компонентов.
 *
 * Проверяется, что компоненты рендерятся и что `testID` и
 * `accessibilityLabel` доходят до дерева. Обязательность этих пропсов —
 * свойство типов, её проверяет tsc, а не эти тесты.
 *
 * Намеренно не проверяется, как именно Pressable прокидывает пропсы в
 * host-элемент: это внутренности React Native, тест на них ломался бы
 * при обновлении версии, ничего не сообщая о нашем коде.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '../Button';
import { Screen } from '../Screen';
import { TextField } from '../TextField';

// Мок библиотеки отдаёт компоненты под `default`, а не именованными
// экспортами, поэтому разворачиваем его явно.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

function render(
  element: React.ReactElement,
): ReactTestRenderer.ReactTestRenderer {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider>{element}</SafeAreaProvider>,
    );
  });
  return tree;
}

function propsOf(
  tree: ReactTestRenderer.ReactTestRenderer,
  testID: string,
): Record<string, unknown> {
  const nodes = tree.root.findAllByProps({ testID });
  expect(nodes.length).toBeGreaterThan(0);
  return nodes[0]?.props ?? {};
}

describe('Button', () => {
  it('рендерится и доносит accessibilityLabel', () => {
    const tree = render(
      <Button label="Далее" accessibilityLabel="Перейти далее" testID="next" />,
    );

    expect(propsOf(tree, 'next').accessibilityLabel).toBe('Перейти далее');
  });

  it('рендерится в недоступном состоянии', () => {
    const tree = render(
      <Button
        label="Далее"
        accessibilityLabel="Перейти далее"
        testID="next"
        disabled
      />,
    );

    expect(tree.root.findAllByProps({ testID: 'next' }).length).toBeGreaterThan(
      0,
    );
  });
});

describe('TextField', () => {
  it('рендерится и доносит accessibilityLabel', () => {
    const tree = render(
      <TextField
        label="Номер"
        accessibilityLabel="Номер паспорта"
        testID="passport"
      />,
    );

    expect(propsOf(tree, 'passport').accessibilityLabel).toBe(
      'Номер паспорта',
    );
  });

  it('без ошибки блок ошибки не рендерится', () => {
    const tree = render(
      <TextField label="Номер" accessibilityLabel="Номер" testID="passport" />,
    );

    expect(tree.root.findAllByProps({ testID: 'passport-error' })).toHaveLength(
      0,
    );
  });

  it('ошибку объявляет вслух', () => {
    const tree = render(
      <TextField
        label="Номер"
        accessibilityLabel="Номер"
        testID="passport"
        error="Неверный формат"
      />,
    );

    const error = propsOf(tree, 'passport-error');
    expect(error.accessibilityRole).toBe('alert');
    expect(error.accessibilityLiveRegion).toBe('polite');
  });
});

describe('Screen', () => {
  it('рендерит вложенное содержимое', () => {
    const tree = render(
      <Screen testID="screen">
        <Button label="Далее" accessibilityLabel="Далее" testID="inner" />
      </Screen>,
    );

    expect(tree.root.findAllByProps({ testID: 'inner' }).length).toBeGreaterThan(
      0,
    );
  });
});
