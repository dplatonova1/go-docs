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
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppThemeProvider } from '../../theme/ThemeProvider';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { GradientButton } from '../GradientButton';
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

    expect(propsOf(tree, 'passport').accessibilityLabel).toBe('Номер паспорта');
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

  /** Отдаёт полю размер и фокус так, как это сделала бы платформа. */
  /**
   * Фокусирует поле и отдаёт рамке размер, как это сделала бы платформа:
   * рамка появляется только в фокусе и меряет себя сама.
   */
  function focusField(tree: ReactTestRenderer.ReactTestRenderer) {
    // Последний — самый глубокий: у самого `TextField` те же `testID` и
    // `onFocus`, но это обработчик экрана, а не поля.
    const inputs = tree.root.findAll(
      node =>
        node.props.testID === 'passport' &&
        typeof node.props.onFocus === 'function',
    );
    const input = inputs[inputs.length - 1]!;
    ReactTestRenderer.act(() => {
      input.props.onFocus({});
    });
    const rings = tree.root.findAll(
      node => typeof node.props.onLayout === 'function',
    );
    ReactTestRenderer.act(() => {
      for (const ring of rings) {
        ring.props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 52 } },
        });
      }
    });
    return input;
  }

  function focusBorders(tree: ReactTestRenderer.ReactTestRenderer) {
    return tree.root.findAll(
      node =>
        typeof node.props.stroke === 'string' &&
        node.props.stroke.startsWith('url(#gradient-ring-'),
    );
  }

  it('в фокусе рисует градиентную рамку и зовёт onFocus/onBlur экрана', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const tree = render(
      <TextField
        label="Номер"
        accessibilityLabel="Номер"
        testID="passport"
        onFocus={onFocus}
        onBlur={onBlur}
      />,
    );

    expect(focusBorders(tree)).toHaveLength(0);
    const input = focusField(tree);
    expect(focusBorders(tree).length).toBeGreaterThan(0);
    expect(onFocus).toHaveBeenCalledTimes(1);

    ReactTestRenderer.act(() => {
      input.props.onBlur({});
    });
    expect(focusBorders(tree)).toHaveLength(0);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('при ошибке рамку фокуса не рисует: красная важнее', () => {
    const tree = render(
      <TextField
        label="Номер"
        accessibilityLabel="Номер"
        testID="passport"
        error="Неверный формат"
      />,
    );

    focusField(tree);
    expect(focusBorders(tree)).toHaveLength(0);
  });
});

describe('IconButton', () => {
  function renderIconButton(busy: boolean) {
    return render(
      <IconButton
        icon="close"
        color="danger"
        accessibilityLabel="Открепить файл скан.pdf"
        testID="detach"
        busy={busy}
      />,
    );
  }

  function button(tree: ReactTestRenderer.ReactTestRenderer) {
    return tree.root.findAll(
      node => node.props.testID === 'detach' && node.props.accessibilityRole,
    )[0]!;
  }

  it('озвучивается подписью — видимой надписи нет', () => {
    const tree = renderIconButton(false);

    expect(button(tree).props.accessibilityLabel).toBe(
      'Открепить файл скан.pdf',
    );
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  });

  it('во время работы — спиннер, «занято» и недоступна', () => {
    const tree = renderIconButton(true);

    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    expect(button(tree).props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });
  });
});

describe('GradientButton', () => {
  it('показывает надпись, озвучивается подписью и сообщает о недоступности', () => {
    const tree = render(
      <GradientButton
        accent="sunset"
        icon="add"
        label="Создать заявку"
        accessibilityLabel="Создать новую заявку"
        testID="add"
        disabled
      />,
    );

    const button = tree.root.findAll(
      node => node.props.testID === 'add' && node.props.accessibilityRole,
    )[0]!;
    expect(button.props.accessibilityLabel).toBe('Создать новую заявку');
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(
      tree.root.findAllByProps({ children: 'Создать заявку' }).length,
    ).toBeGreaterThan(0);
  });
});

describe('Screen', () => {
  it('рендерит вложенное содержимое', () => {
    const tree = render(
      <Screen testID="screen">
        <Button label="Далее" accessibilityLabel="Далее" testID="inner" />
      </Screen>,
    );

    expect(
      tree.root.findAllByProps({ testID: 'inner' }).length,
    ).toBeGreaterThan(0);
  });

  it('по умолчанию не учитывает верхнюю безопасную зону', () => {
    // Её уже учла шапка навигации; второй отступ — пустая полоса под
    // шапкой (ADR-0014).
    const tree = render(<Screen testID="screen">{null}</Screen>);

    expect(resolvedProp(tree, 'screen', 'edges')).toEqual([
      'bottom',
      'left',
      'right',
    ]);
  });

  it.each([
    ['над панелью вкладок содержимое доходит до неё без отступа', 60, 0],
    ['вне вкладок отступ снизу остаётся', undefined, 16],
  ] as const)('%s', (_name, tabBarHeight, paddingBottom) => {
    const tree = render(
      <BottomTabBarHeightContext.Provider value={tabBarHeight}>
        <Screen testID="screen">{null}</Screen>
      </BottomTabBarHeightContext.Provider>,
    );

    const content = StyleSheet.flatten(
      tree.root.findByType(ScrollView).props.contentContainerStyle,
    );
    expect(content.paddingBottom).toBe(paddingBottom);
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
