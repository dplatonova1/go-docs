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
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { darkColors, lightColors } from '../../theme/colors';
import { MIN_TOUCH_TARGET } from '../../theme/metrics';
import { AppThemeProvider } from '../../theme/ThemeProvider';
import { Button } from '../Button';
import { CARD_MEDIA_SIZE, Card } from '../Card';
import { GradientSpinner } from '../GradientSpinner';
import {
  FILLED_HIT_SLOP,
  FILLED_ICON_BUTTON_SIZE,
  IconButton,
} from '../IconButton';
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

  it('по умолчанию не учитывает ни верхнюю, ни нижнюю безопасную зону', () => {
    // Верхнюю уже учла шапка навигации (ADR-0014), нижнюю — панель
    // вкладок: второй отступ — пустая полоса под шапкой или над панелью.
    const tree = render(<Screen testID="screen">{null}</Screen>);

    expect(resolvedProp(tree, 'screen', 'edges')).toEqual(['left', 'right']);
  });

  it.each([
    // Над панелью у прокрутки — отступ после последнего элемента
    // (LIST_END_PADDING), иначе в конце он упирается в панель.
    ['над панелью вкладок прокрутка кончается отступом от панели', 60, 16],
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

/** Плоский стиль host-узла: у Pressable стиль приходит функцией или массивом. */
function flatStyles(
  tree: ReactTestRenderer.ReactTestRenderer,
): Record<string, unknown>[] {
  return tree.root
    .findAll(node => typeof node.type === 'string')
    .map(node => {
      const raw = node.props.style;
      const resolved =
        typeof raw === 'function' ? raw({ pressed: false }) : raw;
      return (StyleSheet.flatten(resolved) ?? {}) as Record<string, unknown>;
    });
}

describe('Card', () => {
  function mediaTiles(tree: ReactTestRenderer.ReactTestRenderer) {
    return flatStyles(tree).filter(
      style =>
        style.width === CARD_MEDIA_SIZE && style.height === CARD_MEDIA_SIZE,
    );
  }

  it('с картинкой и нижней строкой рисует плитку, содержимое и нижнюю строку', () => {
    const tree = render(
      <Card
        testID="card"
        media={<Text>картинка</Text>}
        footer={<Text>низ</Text>}
      >
        <Text>содержимое</Text>
      </Card>,
    );

    const shown = tree.root
      .findAllByType(Text)
      .map(node => node.props.children);
    expect(shown).toEqual(
      expect.arrayContaining(['картинка', 'содержимое', 'низ']),
    );
    expect(mediaTiles(tree)).toHaveLength(1);
  });

  it('media={false} — без пустой плитки: так пишут условный рендер', () => {
    const hasPreview = false;
    const tree = render(
      <Card testID="card" media={hasPreview && <Text>картинка</Text>}>
        <Text>содержимое</Text>
      </Card>,
    );

    expect(mediaTiles(tree)).toHaveLength(0);
  });
});

describe('GradientButton: заливка', () => {
  function backgroundOf(accent: 'sky' | 'rose') {
    const tree = render(
      <GradientButton
        accent={accent}
        label="Собрать пакет"
        accessibilityLabel="Собрать пакет"
        testID="build"
      />,
    );
    return flatStyles(tree).find(style => style.backgroundImage !== undefined)
      ?.backgroundImage;
  }

  it('заливка — градиент выбранного акцента из темы', () => {
    const sky = backgroundOf('sky');
    const rose = backgroundOf('rose');

    expect(String(sky)).toContain('linear-gradient');
    expect(String(rose)).toContain('linear-gradient');
    expect(sky).not.toEqual(rose);
  });
});

describe('IconButton с заливкой', () => {
  function buttonOf(tree: ReactTestRenderer.ReactTestRenderer) {
    return tree.root.findAll(
      node => node.props.testID === 'detach' && node.props.accessibilityRole,
    )[0]!;
  }

  it('круг меньше тач-таргета, зона касания добрана до 44 точек', () => {
    const tree = render(
      <IconButton
        icon="close"
        accent="rose"
        accessibilityLabel="Открепить файл скан.pdf"
        testID="detach"
      />,
    );

    expect(buttonOf(tree).props.hitSlop).toBe(FILLED_HIT_SLOP);
    expect(FILLED_ICON_BUTTON_SIZE + FILLED_HIT_SLOP * 2).toBe(
      MIN_TOUCH_TARGET,
    );
  });

  it('без заливки зона касания и так 44 точки — hitSlop не нужен', () => {
    const tree = render(
      <IconButton
        icon="close"
        color="danger"
        accessibilityLabel="Открепить файл скан.pdf"
        testID="detach"
      />,
    );

    expect(buttonOf(tree).props.hitSlop).toBeUndefined();
  });
});

describe('GradientSpinner', () => {
  it('для скринридера — индикатор выполнения с подписью', () => {
    const tree = render(
      <GradientSpinner accessibilityLabel="Загрузка заявок" testID="spinner" />,
    );

    const spinner = tree.root.findAll(
      node => node.props.testID === 'spinner' && node.props.accessibilityRole,
    )[0]!;
    expect(spinner.props.accessibilityRole).toBe('progressbar');
    expect(spinner.props.accessibilityLabel).toBe('Загрузка заявок');
  });

  it('дуга рисуется градиентом из темы', () => {
    const tree = render(<GradientSpinner accessibilityLabel="Загрузка" />);

    const arcs = tree.root.findAll(
      node =>
        typeof node.props.stroke === 'string' &&
        node.props.stroke.startsWith('url(#spinner-'),
    );
    expect(arcs.length).toBeGreaterThan(0);
  });
});

describe('TextField отключённое', () => {
  it('подсказка — отдельным цветом палитры, без склейки строк', () => {
    const tree = render(
      <TextField
        label="Номер"
        accessibilityLabel="Номер"
        testID="passport"
        placeholder="Номер паспорта"
        editable={false}
      />,
    );

    const colors = [
      lightColors.placeholderDisabled,
      darkColors.placeholderDisabled,
    ];
    expect(colors).toContain(
      resolvedProp(tree, 'passport', 'placeholderTextColor'),
    );
  });
});
