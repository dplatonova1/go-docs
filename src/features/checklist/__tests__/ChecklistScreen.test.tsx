import React from 'react';
import { Alert, type AlertButton } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { StorageError, StorageErrorCode } from '../../../storage/errors';
import {
  cleanup,
  exists,
  findByTestId,
  flush,
  interactiveWithoutA11y,
  press,
  render,
  texts,
} from '../../../test-utils/render';
import { ChecklistScreen } from '../ChecklistScreen';
import type { ApplicationId } from '../model';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('../repository', () => ({
  listChecklistItems: jest.fn(),
  getResetImpact: jest.fn(),
  deleteApplication: jest.fn(),
}));

// Пикер и хранилище — нативные модули; сама цепочка прикрепления
// проверяется в attachDocument.test.ts.
jest.mock('../attachDocument', () => ({
  pickAndAttachDocument: jest.fn(),
}));

jest.mock('../detachDocument', () => ({
  deleteAttachedDocument: jest.fn(),
}));

const repository = require('../repository');
const attach = require('../attachDocument');
const detach = require('../detachDocument');

const APPLICATION = { id: 'app-1' as ApplicationId, title: 'ВНЖ Сербия' };

beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(cleanup);

async function renderScreen(onReset: jest.Mock = jest.fn()) {
  const tree = await render(
    <ChecklistScreen application={APPLICATION} onReset={onReset} />,
  );
  await flush();
  return tree;
}

it('показывает пункты по порядку, статус текстом и имена файлов', async () => {
  repository.listChecklistItems.mockResolvedValue([
    {
      id: 'i1',
      label: 'Паспорт',
      position: 0,
      status: 'pending',
      documents: [],
    },
    {
      id: 'i2',
      label: 'Фото',
      position: 1,
      status: 'attached',
      documents: [{ id: 'd1', name: 'фото 3x4.jpg' }],
    },
  ]);

  const tree = await renderScreen();

  expect(texts(tree)).toEqual(
    expect.arrayContaining([
      'ВНЖ Сербия',
      '1. Паспорт',
      'Не прикреплено',
      '2. Фото',
      'Прикреплено',
      'фото 3x4.jpg',
    ]),
  );
  expect(
    findByTestId(tree, 'checklist-item-1-label').props.accessibilityLabel,
  ).toBe('Пункт 2 из 2: Фото');
  expect(
    findByTestId(tree, 'checklist-item-1-status').props.accessibilityLabel,
  ).toBe('Пункт 2: прикреплено');
  expect(
    findByTestId(tree, 'checklist-item-0-status').props.accessibilityLabel,
  ).toBe('Пункт 1: не прикреплено');
  expect(
    findByTestId(tree, 'checklist-item-1-file-0').props.accessibilityLabel,
  ).toBe('Прикреплённый файл: фото 3x4.jpg');
  expect(interactiveWithoutA11y(tree)).toEqual([]);
});

it('ошибка загрузки — сообщение и повтор', async () => {
  repository.listChecklistItems
    .mockRejectedValueOnce(
      new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
    )
    .mockResolvedValue([
      {
        id: 'i1',
        label: 'Паспорт',
        position: 0,
        status: 'pending',
        documents: [],
      },
    ]);

  const tree = await renderScreen();

  expect(exists(tree, 'checklist-load-error')).toBe(true);
  expect(interactiveWithoutA11y(tree)).toEqual([]);

  await press(tree, 'checklist-retry-button');
  await flush();

  expect(exists(tree, 'checklist-load-error')).toBe(false);
  expect(exists(tree, 'checklist-item-0')).toBe(true);
});

describe('сброс заявки', () => {
  const IMPACT = {
    itemCount: 2,
    deletedDocumentCount: 0,
    keptDocumentCount: 0,
  };

  beforeEach(() => {
    repository.listChecklistItems.mockResolvedValue([
      {
        id: 'i1',
        label: 'Паспорт',
        position: 0,
        status: 'pending',
        documents: [],
      },
      {
        id: 'i2',
        label: 'Фото',
        position: 1,
        status: 'pending',
        documents: [],
      },
    ]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function lastAlert(): {
    title: string;
    message: string;
    buttons: AlertButton[];
  } {
    const calls = (Alert.alert as jest.Mock).mock.calls;
    const call = calls[calls.length - 1] ?? [];
    return {
      title: call[0],
      message: call[1],
      buttons: (call[2] ?? []) as AlertButton[],
    };
  }

  async function confirmInDialog() {
    const confirm = lastAlert().buttons.find(b => b.style === 'destructive');
    await ReactTestRenderer.act(async () => {
      confirm?.onPress?.();
    });
    await flush();
  }

  it('кнопка под списком и доступна скринридеру', async () => {
    const tree = await renderScreen();

    expect(exists(tree, 'reset-application-button')).toBe(true);
    expect(interactiveWithoutA11y(tree)).toEqual([]);
  });

  it('сначала диалог с числами — без удаления', async () => {
    repository.getResetImpact.mockResolvedValue(IMPACT);
    const onReset = jest.fn();
    const tree = await renderScreen(onReset);

    await press(tree, 'reset-application-button');

    expect(repository.getResetImpact).toHaveBeenCalledWith('app-1');
    const { title, message, buttons } = lastAlert();
    expect(title).toBe('Сбросить заявку «ВНЖ Сербия»?');
    expect(message).toContain('(2)');
    // «Отмена» первой и с ролью cancel.
    expect(buttons[0]?.style).toBe('cancel');
    expect(repository.deleteApplication).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });

  it('подтверждение удаляет заявку и возвращает к созданию', async () => {
    repository.getResetImpact.mockResolvedValue(IMPACT);
    repository.deleteApplication.mockResolvedValue(undefined);
    const onReset = jest.fn();
    const tree = await renderScreen(onReset);

    await press(tree, 'reset-application-button');
    await confirmInDialog();

    expect(repository.deleteApplication).toHaveBeenCalledWith('app-1');
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('ошибка удаления показывается, экран и кнопка остаются', async () => {
    repository.getResetImpact.mockResolvedValue(IMPACT);
    repository.deleteApplication.mockRejectedValue(
      new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
    );
    const onReset = jest.fn();
    const tree = await renderScreen(onReset);

    await press(tree, 'reset-application-button');
    await confirmInDialog();

    expect(onReset).not.toHaveBeenCalled();
    expect(exists(tree, 'reset-application-error')).toBe(true);
    expect(exists(tree, 'checklist-item-0')).toBe(true);
    expect(findByTestId(tree, 'reset-application-button').props.disabled).toBe(
      false,
    );
  });

  it('не удалось подсчитать — сообщение, диалога нет', async () => {
    repository.getResetImpact.mockRejectedValue(
      new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
    );
    const tree = await renderScreen();

    await press(tree, 'reset-application-button');

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(exists(tree, 'reset-application-error')).toBe(true);
    expect(repository.deleteApplication).not.toHaveBeenCalled();
  });
});

describe('прикрепление файла', () => {
  beforeEach(() => {
    repository.listChecklistItems.mockResolvedValue([
      {
        id: 'i1',
        label: 'Паспорт',
        position: 0,
        status: 'pending',
        documents: [],
      },
      {
        id: 'i2',
        label: 'Фото',
        position: 1,
        status: 'pending',
        documents: [],
      },
    ]);
  });

  it('у каждого пункта своя кнопка с подписью для скринридера', async () => {
    const tree = await renderScreen();

    const button = findByTestId(tree, 'checklist-item-1-attach');
    expect(button.props.accessibilityLabel).toBe(
      'Прикрепить файл к пункту 2: Фото',
    );
    expect(button.props.label).toBe('Прикрепить файл');
  });

  it('после прикрепления пункт показывает статус и имя файла', async () => {
    attach.pickAndAttachDocument.mockResolvedValue({
      status: 'attached',
      document: { id: 'd1', name: 'Паспорт.pdf' },
    });
    const tree = await renderScreen();

    await press(tree, 'checklist-item-0-attach');

    expect(attach.pickAndAttachDocument).toHaveBeenCalledWith('i1');
    expect(
      findByTestId(tree, 'checklist-item-0-status').props.accessibilityLabel,
    ).toBe('Пункт 1: прикреплено');
    expect(findByTestId(tree, 'checklist-item-0-file-0').props.children).toBe(
      'Паспорт.pdf',
    );
    expect(findByTestId(tree, 'checklist-item-0-attach').props.label).toBe(
      'Прикрепить ещё файл',
    );
    // Второй пункт не затронут.
    expect(
      findByTestId(tree, 'checklist-item-1-status').props.accessibilityLabel,
    ).toBe('Пункт 2: не прикреплено');
    expect(interactiveWithoutA11y(tree)).toEqual([]);
  });

  it('отмена выбора ничего не меняет', async () => {
    attach.pickAndAttachDocument.mockResolvedValue({ status: 'canceled' });
    const tree = await renderScreen();

    await press(tree, 'checklist-item-0-attach');

    expect(
      findByTestId(tree, 'checklist-item-0-status').props.accessibilityLabel,
    ).toBe('Пункт 1: не прикреплено');
    expect(exists(tree, 'checklist-item-0-error')).toBe(false);
  });

  it('ошибка показывается у своего пункта, кнопка снова доступна', async () => {
    attach.pickAndAttachDocument.mockRejectedValue(
      new StorageError(StorageErrorCode.FileTooLarge, 'детали'),
    );
    const tree = await renderScreen();

    await press(tree, 'checklist-item-1-attach');

    expect(exists(tree, 'checklist-item-1-error')).toBe(true);
    expect(exists(tree, 'checklist-item-0-error')).toBe(false);
    expect(findByTestId(tree, 'checklist-item-1-attach').props.disabled).toBe(
      false,
    );
  });

  it('пока файл прикрепляется, остальные кнопки и сброс недоступны', async () => {
    let finish: (value: unknown) => void = () => {};
    attach.pickAndAttachDocument.mockImplementation(
      () => new Promise(resolve => (finish = resolve)),
    );
    const tree = await renderScreen();

    const attachFirst = findByTestId(tree, 'checklist-item-0-attach').props
      .onPress;
    await ReactTestRenderer.act(async () => {
      attachFirst();
      attachFirst();
    });

    expect(attach.pickAndAttachDocument).toHaveBeenCalledTimes(1);
    expect(findByTestId(tree, 'checklist-item-0-attach').props.label).toBe(
      'Прикрепление…',
    );
    expect(findByTestId(tree, 'checklist-item-1-attach').props.disabled).toBe(
      true,
    );
    expect(findByTestId(tree, 'reset-application-button').props.disabled).toBe(
      true,
    );

    await ReactTestRenderer.act(async () => {
      finish({ status: 'canceled' });
    });
  });
});

describe('удаление прикреплённого файла', () => {
  const DOCUMENT = { id: 'd1', name: 'Паспорт.pdf' };

  beforeEach(() => {
    repository.listChecklistItems.mockResolvedValue([
      {
        id: 'i1',
        label: 'Паспорт',
        position: 0,
        status: 'attached',
        documents: [DOCUMENT],
      },
      {
        id: 'i2',
        label: 'Фото',
        position: 1,
        status: 'pending',
        documents: [],
      },
    ]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function lastAlertButtons(): AlertButton[] {
    const calls = (Alert.alert as jest.Mock).mock.calls;
    return (calls[calls.length - 1]?.[2] ?? []) as AlertButton[];
  }

  async function confirmDeletion() {
    const confirm = lastAlertButtons().find(b => b.style === 'destructive');
    await ReactTestRenderer.act(async () => {
      confirm?.onPress?.();
    });
    await flush();
  }

  it('у каждого файла своя кнопка удаления с именем файла в подписи', async () => {
    const tree = await renderScreen();

    const button = findByTestId(tree, 'checklist-item-0-file-0-delete');
    expect(button.props.accessibilityLabel).toBe(
      'Удалить файл Паспорт.pdf из пункта 1: Паспорт',
    );
    expect(button.props.label).toBe('Удалить');
    expect(interactiveWithoutA11y(tree)).toEqual([]);
  });

  it('диалог говорит об удалении без восстановления и ничего не удаляет сразу', async () => {
    const tree = await renderScreen();

    await press(tree, 'checklist-item-0-file-0-delete');

    const [title, message] = (Alert.alert as jest.Mock).mock.calls[0] ?? [];
    expect(title).toBe('Удалить файл «Паспорт.pdf»?');
    expect(message).toContain('удалён без возможности восстановления');
    expect(String(message).toLowerCase()).not.toContain('открепить');
    expect(lastAlertButtons()[0]?.style).toBe('cancel');
    expect(detach.deleteAttachedDocument).not.toHaveBeenCalled();
  });

  it('после подтверждения файл пропадает, пункт снова не прикреплён', async () => {
    detach.deleteAttachedDocument.mockResolvedValue(undefined);
    const tree = await renderScreen();

    await press(tree, 'checklist-item-0-file-0-delete');
    await confirmDeletion();

    expect(detach.deleteAttachedDocument).toHaveBeenCalledWith('i1', 'd1');
    expect(exists(tree, 'checklist-item-0-file-0')).toBe(false);
    expect(
      findByTestId(tree, 'checklist-item-0-status').props.accessibilityLabel,
    ).toBe('Пункт 1: не прикреплено');
  });

  it('отмена в диалоге ничего не удаляет', async () => {
    const tree = await renderScreen();

    await press(tree, 'checklist-item-0-file-0-delete');

    expect(detach.deleteAttachedDocument).not.toHaveBeenCalled();
    expect(exists(tree, 'checklist-item-0-file-0')).toBe(true);
  });

  it('ошибка удаления показывается у пункта, файл остаётся на экране', async () => {
    detach.deleteAttachedDocument.mockRejectedValue(
      new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
    );
    const tree = await renderScreen();

    await press(tree, 'checklist-item-0-file-0-delete');
    await confirmDeletion();

    expect(exists(tree, 'checklist-item-0-error')).toBe(true);
    expect(exists(tree, 'checklist-item-0-file-0')).toBe(true);
    expect(
      findByTestId(tree, 'checklist-item-0-status').props.accessibilityLabel,
    ).toBe('Пункт 1: прикреплено');
  });

  it('во время удаления остальные действия недоступны', async () => {
    let finish: (value: unknown) => void = () => {};
    detach.deleteAttachedDocument.mockImplementation(
      () => new Promise(resolve => (finish = resolve)),
    );
    const tree = await renderScreen();

    await press(tree, 'checklist-item-0-file-0-delete');
    const confirm = lastAlertButtons().find(b => b.style === 'destructive');
    await ReactTestRenderer.act(async () => {
      confirm?.onPress?.();
      confirm?.onPress?.();
    });

    expect(detach.deleteAttachedDocument).toHaveBeenCalledTimes(1);
    expect(
      findByTestId(tree, 'checklist-item-0-file-0-delete').props.label,
    ).toBe('Удаление…');
    expect(findByTestId(tree, 'checklist-item-1-attach').props.disabled).toBe(
      true,
    );
    expect(findByTestId(tree, 'reset-application-button').props.disabled).toBe(
      true,
    );

    await ReactTestRenderer.act(async () => {
      finish(undefined);
    });
  });
});
