/**
 * Помощники для тестов экранов на react-test-renderer.
 *
 * Элементы ищутся по `testID` — это тот же контракт, по которому их
 * найдут e2e-тесты. Первый найденный узел — внешний компонент (`Button`,
 * `TextField`), у которого есть и `onPress`/`onChangeText`, и `disabled`.
 */

import type { ReactElement } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppThemeProvider } from '../theme/ThemeProvider';

export type Tree = ReactTestRenderer.ReactTestRenderer;
export type TestNode = ReactTestRenderer.ReactTestInstance;

const mounted = new Set<Tree>();

/**
 * Рендер с провайдерами, без которых экраны не работают.
 *
 * Дерево запоминается для `cleanup`: без размонтирования `FlatList`
 * дорисовывает ячейки по таймеру уже после конца теста, и Jest сыплет
 * «Cannot log after tests are done» — причём в случайном тесте.
 */
export async function render(element: ReactElement): Promise<Tree> {
  let tree!: Tree;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider>
        <AppThemeProvider>{element}</AppThemeProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.add(tree);
  return tree;
}

/** Размонтирует всё, что отрендерил `render`. Вызывать в `afterEach`. */
export function cleanup(): void {
  ReactTestRenderer.act(() => {
    for (const tree of mounted) {
      tree.unmount();
    }
  });
  mounted.clear();
}

export function findAllByTestId(tree: Tree, testID: string): TestNode[] {
  return tree.root.findAll(node => node.props.testID === testID);
}

export function exists(tree: Tree, testID: string): boolean {
  return findAllByTestId(tree, testID).length > 0;
}

export function findByTestId(tree: Tree, testID: string): TestNode {
  const node = findAllByTestId(tree, testID)[0];
  if (node === undefined) {
    throw new Error(`Нет элемента с testID="${testID}"`);
  }
  return node;
}

export function typeText(tree: Tree, testID: string, value: string): void {
  ReactTestRenderer.act(() => {
    findByTestId(tree, testID).props.onChangeText(value);
  });
}

/** Нажимает кнопку. Недоступная кнопка — ошибка теста, а не тихий пропуск. */
export async function press(tree: Tree, testID: string): Promise<void> {
  const node = findByTestId(tree, testID);
  if (node.props.disabled === true) {
    throw new Error(`Кнопка testID="${testID}" недоступна`);
  }
  await ReactTestRenderer.act(async () => {
    await node.props.onPress();
  });
}

/** Дожидается промисов, запущенных эффектами (загрузка данных). */
export async function flush(): Promise<void> {
  await ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => setImmediate(resolve));
  });
}

/** Все тексты дерева — для проверки того, что видит пользователь. */
export function texts(tree: Tree): string[] {
  return tree.root
    .findAll(node => (node.type as unknown) === 'Text')
    .flatMap(node =>
      node.children.filter(
        (child): child is string => typeof child === 'string',
      ),
    );
}

/**
 * Интерактивные элементы без `accessibilityLabel` или `testID`.
 *
 * Интерактивный — любой компонент с `onPress` или `onChangeText`. Правило
 * проекта: у каждого такого есть оба пропса.
 */
export function interactiveWithoutA11y(tree: Tree): string[] {
  return tree.root
    .findAll(
      node =>
        typeof node.props.onPress === 'function' ||
        typeof node.props.onChangeText === 'function',
    )
    .filter(
      node =>
        typeof node.props.accessibilityLabel !== 'string' ||
        node.props.accessibilityLabel.length === 0 ||
        typeof node.props.testID !== 'string' ||
        node.props.testID.length === 0,
    )
    .map(node => {
      const type = node.type as
        | { displayName?: string; name?: string }
        | string;
      const name =
        typeof type === 'string' ? type : type.displayName ?? type.name ?? '?';
      return `${name} (testID=${String(node.props.testID)})`;
    });
}
