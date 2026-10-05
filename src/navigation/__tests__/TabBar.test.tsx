/**
 * Нижняя панель вкладок: какая вкладка выбрана, что делает нажатие и
 * пилюля активной вкладки (ADR-0022, ADR-0011 «Обновление»).
 *
 * Навигатор не поднимается: панели передаются те же пропсы, что дал бы
 * `bottom-tabs`, — так проверяется именно панель, а не библиотека.
 * Анимацию пилюли тест не видит; проверяется, что пилюля появляется,
 * когда известны размеры, и не мешает касаниям.
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {
  cleanup,
  findByTestId,
  press,
  render,
  type Tree,
} from '../../test-utils/render';
import { TabBar } from '../TabBar';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

afterEach(() => {
  cleanup();
});

const ROUTES = [
  { key: 'home', name: 'HomeTab' },
  { key: 'library', name: 'LibraryTab' },
  { key: 'settings', name: 'SettingsTab' },
];

const DESCRIPTORS = {
  home: { options: { title: 'Главная' } },
  library: { options: { title: 'Библиотека' } },
  settings: { options: { title: 'Настройки' } },
};

function renderTabBar(activeIndex: number) {
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };
  const props = {
    state: { index: activeIndex, routes: ROUTES },
    descriptors: DESCRIPTORS,
    navigation,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  } as unknown as BottomTabBarProps;

  return render(<TabBar {...props} />).then(tree => ({ tree, navigation }));
}

/** Узел-вкладка с ролью — у Pressable `testID` есть и снаружи, и внутри. */
function tab(tree: Tree, testID: string) {
  return tree.root.findAll(
    node => node.props.testID === testID && node.props.accessibilityRole,
  )[0]!;
}

describe('выбранная вкладка', () => {
  it('скринридер слышит, какая вкладка выбрана', async () => {
    const { tree } = await renderTabBar(1);

    expect(tab(tree, 'tab-home').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(tab(tree, 'tab-library').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(tab(tree, 'tab-settings').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(tab(tree, 'tab-library').props.accessibilityRole).toBe('tab');
  });
});

describe('нажатие', () => {
  it('на другую вкладку — событие tabPress и переход', async () => {
    const { tree, navigation } = await renderTabBar(0);

    await press(tree, 'tab-settings');

    expect(navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'settings' }),
    );
    expect(navigation.navigate).toHaveBeenCalledWith('SettingsTab', undefined);
  });

  it('на уже открытую — только событие: стек вкладки сам вернётся к началу', async () => {
    const { tree, navigation } = await renderTabBar(0);

    await press(tree, 'tab-home');

    expect(navigation.emit).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});

describe('пилюля активной вкладки', () => {
  /** Пилюля — слой с градиентом, который пропускает касания. */
  function pills(tree: Tree) {
    return tree.root.findAll(
      node =>
        typeof node.type === 'string' &&
        node.props.pointerEvents === 'none' &&
        JSON.stringify(node.props.style ?? '').includes('linear-gradient'),
    );
  }

  it('появляется, когда известны размеры ряда и вкладки', async () => {
    const { tree } = await renderTabBar(1);

    // До замера рисовать её не с чего.
    expect(pills(tree)).toHaveLength(0);

    const measured = tree.root.findAll(
      node =>
        typeof node.type === 'string' &&
        typeof node.props.onLayout === 'function',
    );
    ReactTestRenderer.act(() => {
      for (const node of measured) {
        node.props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 56 } },
        });
      }
    });

    expect(pills(tree)).toHaveLength(1);
    // Подпись выбранной вкладки по-прежнему на месте и нажимается.
    expect(findByTestId(tree, 'tab-library')).toBeDefined();
  });
});
