/**
 * Экран создания заявки.
 *
 * Главное, что здесь проверяется: результат эвристики не пишется в базу
 * напрямую. Он всегда проходит через редактируемый список, и
 * `createApplication` вызывается только нажатием «Сохранить» — ровно с
 * тем списком, который пользователь видит на экране.
 */

import React from 'react';
import { AccessibilityInfo, Alert, type AlertButton } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import {
  cleanup,
  exists,
  findByTestId,
  interactiveWithoutA11y,
  press,
  render,
  typeText,
  type Tree,
} from '../../../test-utils/render';
import { CreateApplicationScreen } from '../CreateApplicationScreen';
import { ApplicationAlreadyExistsError } from '../errors';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('../repository', () => ({
  createApplication: jest.fn(),
}));

const repository = require('../repository');

const DRAFT_INPUT = /^draft-item-\d+-input$/;

function draftLabels(tree: Tree): string[] {
  // Внешний TextField: у него есть и testID, и видимая подпись `label`.
  return tree.root
    .findAll(
      node =>
        DRAFT_INPUT.test(String(node.props.testID)) &&
        typeof node.props.label === 'string',
    )
    .map(node => node.props.value);
}

async function renderScreen(onCreated: jest.Mock = jest.fn()) {
  const tree = await render(<CreateApplicationScreen onCreated={onCreated} />);
  return { tree, onCreated };
}

async function parse(tree: Tree, text: string) {
  typeText(tree, 'checklist-text-input', text);
  await press(tree, 'parse-checklist-button');
}

function lastAlertButtons(): AlertButton[] {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return (calls[calls.length - 1]?.[2] ?? []) as AlertButton[];
}

beforeEach(() => {
  jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  repository.createApplication.mockReset();
});

describe('разбор текста', () => {
  it('строит редактируемый список и ничего не пишет в базу', async () => {
    const { tree } = await renderScreen();

    await parse(tree, '1. Паспорт\n\n- Фото\n• Справка');

    expect(draftLabels(tree)).toEqual(['Паспорт', 'Фото', 'Справка']);
    expect(repository.createApplication).not.toHaveBeenCalled();
  });

  it('кнопка разбора недоступна, пока текст пуст', async () => {
    const { tree } = await renderScreen();
    expect(findByTestId(tree, 'parse-checklist-button').props.disabled).toBe(
      true,
    );
  });

  it('текст без пунктов — сообщение у поля', async () => {
    const { tree } = await renderScreen();

    await parse(tree, '-\n•\n');

    expect(exists(tree, 'checklist-text-input-error')).toBe(true);
    expect(draftLabels(tree)).toEqual([]);
  });

  it('повторный разбор поверх списка — только после подтверждения', async () => {
    const { tree } = await renderScreen();
    await parse(tree, 'Паспорт');
    typeText(tree, 'draft-item-0-input', 'Паспорт (правка)');

    await parse(tree, 'Фото\nСправка');

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(draftLabels(tree)).toEqual(['Паспорт (правка)']);

    const confirm = lastAlertButtons().find(b => b.style === 'destructive');
    ReactTestRenderer.act(() => {
      confirm?.onPress?.();
    });

    expect(draftLabels(tree)).toEqual(['Фото', 'Справка']);
  });
});

describe('ручная правка списка', () => {
  it('текст, порядок, удаление и добавление', async () => {
    const { tree } = await renderScreen();
    await parse(tree, 'Паспорт\nФото\nСправка');

    typeText(tree, 'draft-item-1-input', 'Фото 3×4');
    await press(tree, 'draft-item-2-move-up');
    expect(draftLabels(tree)).toEqual(['Паспорт', 'Справка', 'Фото 3×4']);

    await press(tree, 'draft-item-0-move-down');
    expect(draftLabels(tree)).toEqual(['Справка', 'Паспорт', 'Фото 3×4']);

    await press(tree, 'draft-item-1-remove');
    expect(draftLabels(tree)).toEqual(['Справка', 'Фото 3×4']);

    await press(tree, 'add-checklist-item-button');
    typeText(tree, 'draft-item-2-input', 'Выписка со счёта');
    expect(draftLabels(tree)).toEqual([
      'Справка',
      'Фото 3×4',
      'Выписка со счёта',
    ]);
  });

  it('пункты можно добавить и без разбора текста', async () => {
    const { tree } = await renderScreen();

    await press(tree, 'add-checklist-item-button');
    typeText(tree, 'draft-item-0-input', 'Паспорт');

    expect(draftLabels(tree)).toEqual(['Паспорт']);
  });

  it('первый пункт нельзя поднять, последний — опустить', async () => {
    const { tree } = await renderScreen();
    await parse(tree, 'А\nБ');

    expect(findByTestId(tree, 'draft-item-0-move-up').props.disabled).toBe(
      true,
    );
    expect(findByTestId(tree, 'draft-item-0-move-down').props.disabled).toBe(
      false,
    );
    expect(findByTestId(tree, 'draft-item-1-move-up').props.disabled).toBe(
      false,
    );
    expect(findByTestId(tree, 'draft-item-1-move-down').props.disabled).toBe(
      true,
    );
  });

  it('перестановка и удаление объявляются скринридеру', async () => {
    const { tree } = await renderScreen();
    await parse(tree, 'А\nБ');

    await press(tree, 'draft-item-1-move-up');
    await press(tree, 'draft-item-0-remove');

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Пункт перемещён выше',
    );
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Пункт удалён',
    );
  });
});

describe('сохранение', () => {
  it('сохраняет ровно тот список, что на экране', async () => {
    const application = { id: 'app-1', title: 'ВНЖ Сербия' };
    repository.createApplication.mockResolvedValue(application);
    const { tree, onCreated } = await renderScreen();

    typeText(tree, 'application-title-input', '  ВНЖ Сербия ');
    await parse(tree, 'Паспорт\nФото\nЗаголовок раздела:');
    typeText(tree, 'draft-item-0-input', 'Загранпаспорт');
    await press(tree, 'draft-item-2-remove');
    await press(tree, 'draft-item-1-move-up');

    await press(tree, 'save-application-button');

    expect(repository.createApplication).toHaveBeenCalledTimes(1);
    expect(repository.createApplication).toHaveBeenCalledWith({
      title: 'ВНЖ Сербия',
      itemLabels: ['Фото', 'Загранпаспорт'],
    });
    expect(onCreated).toHaveBeenCalledWith(application);
  });

  it('без названия не сохраняет и показывает ошибку', async () => {
    const { tree } = await renderScreen();
    await parse(tree, 'Паспорт');

    // До попытки сохранить форму красным не подсвечиваем.
    expect(exists(tree, 'application-title-input-error')).toBe(false);

    await press(tree, 'save-application-button');

    expect(repository.createApplication).not.toHaveBeenCalled();
    expect(exists(tree, 'application-title-input-error')).toBe(true);
    expect(exists(tree, 'draft-title-error')).toBe(true);
  });

  it('без пунктов не сохраняет', async () => {
    const { tree } = await renderScreen();
    typeText(tree, 'application-title-input', 'ВНЖ');

    await press(tree, 'save-application-button');

    expect(repository.createApplication).not.toHaveBeenCalled();
    expect(exists(tree, 'draft-no-items-error')).toBe(true);
  });

  it('пустой пункт не выбрасывается молча, а блокирует сохранение', async () => {
    const { tree } = await renderScreen();
    typeText(tree, 'application-title-input', 'ВНЖ');
    await parse(tree, 'Паспорт');
    await press(tree, 'add-checklist-item-button');

    await press(tree, 'save-application-button');

    expect(repository.createApplication).not.toHaveBeenCalled();
    expect(exists(tree, 'draft-item-1-input-error')).toBe(true);
    expect(exists(tree, 'draft-item-0-input-error')).toBe(false);
    expect(exists(tree, 'draft-empty-items-error')).toBe(true);
  });

  it('двойное нажатие не создаёт две заявки', async () => {
    let finish: (value: unknown) => void = () => {};
    repository.createApplication.mockImplementation(
      () => new Promise(resolve => (finish = resolve)),
    );
    const { tree } = await renderScreen();
    typeText(tree, 'application-title-input', 'ВНЖ');
    await parse(tree, 'Паспорт');

    const save = findByTestId(tree, 'save-application-button').props.onPress;
    await ReactTestRenderer.act(async () => {
      save();
      save();
    });

    expect(repository.createApplication).toHaveBeenCalledTimes(1);
    expect(findByTestId(tree, 'save-application-button').props.disabled).toBe(
      true,
    );

    await ReactTestRenderer.act(async () => {
      finish({ id: 'app-1', title: 'ВНЖ' });
    });
  });

  it('ошибка сохранения показывается, список не теряется, можно повторить', async () => {
    repository.createApplication.mockRejectedValue(
      new ApplicationAlreadyExistsError(),
    );
    const { tree, onCreated } = await renderScreen();
    typeText(tree, 'application-title-input', 'ВНЖ');
    await parse(tree, 'Паспорт\nФото');

    await press(tree, 'save-application-button');

    expect(exists(tree, 'save-application-error')).toBe(true);
    expect(onCreated).not.toHaveBeenCalled();
    expect(draftLabels(tree)).toEqual(['Паспорт', 'Фото']);
    expect(findByTestId(tree, 'save-application-button').props.disabled).toBe(
      false,
    );
  });
});

describe('оформление пунктов', () => {
  it('разобранные пункты уже оформлены', async () => {
    const { tree } = await renderScreen();

    await parse(tree, '1. копия паспорта;\n- фото 3×4,');

    expect(draftLabels(tree)).toEqual(['Копия паспорта', 'Фото 3×4']);
  });

  it('при уходе из поля пункт оформляется, а во время набора — нет', async () => {
    const { tree } = await renderScreen();
    await press(tree, 'add-checklist-item-button');

    typeText(tree, 'draft-item-0-input', 'паспорт, ');
    // Пока пользователь печатает, запятая не пропадает.
    expect(draftLabels(tree)).toEqual(['паспорт, ']);

    ReactTestRenderer.act(() => {
      findByTestId(tree, 'draft-item-0-input').props.onBlur();
    });

    expect(draftLabels(tree)).toEqual(['Паспорт']);
  });

  it('сохраняется оформленный текст, даже если поле не теряло фокус', async () => {
    repository.createApplication.mockResolvedValue({
      id: 'app-1',
      title: 'ВНЖ',
    });
    const { tree } = await renderScreen();
    typeText(tree, 'application-title-input', 'ВНЖ');
    await press(tree, 'add-checklist-item-button');
    typeText(tree, 'draft-item-0-input', 'копия диплома;');

    await press(tree, 'save-application-button');

    expect(repository.createApplication).toHaveBeenCalledWith({
      title: 'ВНЖ',
      itemLabels: ['Копия диплома'],
    });
  });
});

describe('доступность', () => {
  it('у каждого интерактивного элемента есть accessibilityLabel и testID', async () => {
    const { tree } = await renderScreen();
    typeText(tree, 'application-title-input', 'ВНЖ');
    await parse(tree, 'Паспорт\nФото');
    await press(tree, 'add-checklist-item-button');
    await press(tree, 'save-application-button');

    expect(interactiveWithoutA11y(tree)).toEqual([]);
  });
});
