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

import { AppThemeProvider } from '../../theme/ThemeProvider';
import { Button } from '../Button';
import { ALL_EDGES, Screen } from '../Screen';
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
      <SafeAreaProvider>
        <AppThemeProvider>{element}</AppThemeProvider>
      </SafeAreaProvider>,
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

/**
 * Значение пропса там, где он уже подставлен.
 *
 * `testID` есть и у самого компонента, и у узлов внутри него, а пропсы со
 * значением по умолчанию появляются только внутри — поэтому берётся
 * первый узел, где пропс определён, а не самый внешний.
 */
function resolvedProp(
  tree: ReactTestRenderer.ReactTestRenderer,
  testID: string,
  prop: string,
): unknown {
  return tree.root.find(
    candidate =>
      candidate.props.testID === testID && candidate.props[prop] !== undefined,
  ).props[prop];
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

  it('нативная подчёркивающая линия Android отключена', () => {
    // Иначе поверх рамки поля Android рисует свою нижнюю линию — на iOS
    // этого не видно, и регрессия прошла бы незамеченной.
    const tree = render(
      <TextField label="Номер" accessibilityLabel="Номер" testID="passport" />,
    );

    expect(resolvedProp(tree, 'passport', 'underlineColorAndroid')).toBe(
      'transparent',
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

  it('по умолчанию не учитывает верхнюю безопасную зону', () => {
    // Её уже учла шапка навигации; второй отступ — пустая полоса под
    // шапкой (ADR-0014).
    const tree = render(<Screen testID="screen">{null}</Screen>);

    expect(resolvedProp(tree, 'screen', 'edges')).toEqual(['bottom', 'left', 'right']);
  });

  it('экран вне навигации может запросить все зоны', () => {
    const tree = render(
      <Screen testID="screen" edges={ALL_EDGES}>
        {null}
      </Screen>,
    );

    expect(resolvedProp(tree, 'screen', 'edges')).toContain('top');
  });
});
