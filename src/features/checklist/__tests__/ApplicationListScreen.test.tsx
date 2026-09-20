/**
 * Экран списка заявок: открыть, переименовать, удалить, создать.
 *
 * Порядок строк задаёт репозиторий (недавно открытые сверху) — экран его
 * не пересортировывает, иначе «последняя открытая» из ADR-0015
 * разъехалась бы между списком и запуском.
 *
 * Удаление проверяется целиком по цепочке «подсчёт → диалог →
 * подтверждение»: оно необратимо, и диалог пропустить нельзя.
 */

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
import { ApplicationListScreen } from '../ApplicationListScreen';
import type { ApplicationId } from '../model';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('../repository', () => ({
  listApplications: jest.fn(),
  getApplicationDeletionImpact: jest.fn(),
  deleteApplication: jest.fn(),
}));

const repository = require('../repository');

const APPLICATIONS = [
  { id: 'app-2' as ApplicationId, title: 'ПМЖ Сербия' },
  { id: 'app-1' as ApplicationId, title: 'ВНЖ Сербия' },
];

beforeEach(() => {
  jest.resetAllMocks();
  repository.getApplicationDeletionImpact.mockResolvedValue({
    itemCount: 7,
    documentCount: 2,
  });
  repository.deleteApplication.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

type Handlers = {
  onOpen?: jest.Mock;
  onRename?: jest.Mock;
  onCreate?: jest.Mock;
  onOpenLibrary?: jest.Mock;
  isFocused?: boolean;
};

async function renderScreen({
  onOpen = jest.fn(),
  onRename = jest.fn(),
  onCreate = jest.fn(),
  onOpenLibrary = jest.fn(),
  isFocused = true,
}: Handlers = {}) {
  const tree = await render(
    <ApplicationListScreen
      isFocused={isFocused}
      onOpen={onOpen}
      onRename={onRename}
      onCreate={onCreate}
      onOpenLibrary={onOpenLibrary}
    />,
  );
  await flush();
  return { tree, onOpen, onRename, onCreate, onOpenLibrary };
}

function lastAlertButtons(): AlertButton[] {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return (calls[calls.length - 1]?.[2] ?? []) as AlertButton[];
}

async function confirmDelete() {
  const confirm = lastAlertButtons().find(b => b.style === 'destructive');
  await ReactTestRenderer.act(async () => {
    confirm?.onPress?.();
  });
  await flush();
}

describe('список', () => {
  it('показывает заявки в порядке репозитория', async () => {
    repository.listApplications.mockResolvedValue(APPLICATIONS);

    const { tree } = await renderScreen();

    expect(texts(tree)).toEqual(
      expect.arrayContaining(['ПМЖ Сербия', 'ВНЖ Сербия']),
    );
    expect(
      findByTestId(tree, 'application-row-0-open').props.accessibilityLabel,
    ).toBe('Заявка 1 из 2: ПМЖ Сербия. Открыть чек-лист');
    expect(exists(tree, 'application-list-empty')).toBe(false);
  });

  it('без заявок — подсказка, с чего начать, и кнопка создания', async () => {
    repository.listApplications.mockResolvedValue([]);

    const { tree } = await renderScreen();

    expect(exists(tree, 'application-list-empty')).toBe(true);
    expect(exists(tree, 'create-application-button')).toBe(true);
    expect(exists(tree, 'application-list-error')).toBe(false);
  });

  it('сбой чтения — сообщение и повтор, а не пустой список', async () => {
    repository.listApplications.mockRejectedValueOnce(
      new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
    );
    repository.listApplications.mockResolvedValue(APPLICATIONS);

    const { tree } = await renderScreen();

    expect(exists(tree, 'application-list-error')).toBe(true);
    expect(texts(tree)).not.toContain('детали');

    await press(tree, 'application-list-retry-button');
    await flush();

    expect(exists(tree, 'application-list-error')).toBe(false);
    expect(texts(tree)).toEqual(expect.arrayContaining(['ПМЖ Сербия']));
  });

  it('без фокуса не читает список: экран под другим не грузит данные', async () => {
    repository.listApplications.mockResolvedValue(APPLICATIONS);

    await renderScreen({ isFocused: false });

    expect(repository.listApplications).not.toHaveBeenCalled();
  });

  it('у всего интерактивного есть accessibilityLabel и testID', async () => {
    repository.listApplications.mockResolvedValue(APPLICATIONS);

    const { tree } = await renderScreen();

    expect(interactiveWithoutA11y(tree)).toEqual([]);
  });
});

describe('выбор заявки', () => {
  it('нажатие на название открывает именно её', async () => {
    repository.listApplications.mockResolvedValue(APPLICATIONS);

    const { tree, onOpen } = await renderScreen();
    await press(tree, 'application-row-1-open');

    expect(onOpen).toHaveBeenCalledWith(APPLICATIONS[1]);
  });

  it('кнопка создания зовёт onCreate', async () => {
    repository.listApplications.mockResolvedValue([]);

    const { tree, onCreate } = await renderScreen();
    await press(tree, 'create-application-button');

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('библиотека документов открывается отсюда — она общая для заявок', async () => {
    repository.listApplications.mockResolvedValue(APPLICATIONS);

    const { tree, onOpenLibrary } = await renderScreen();
    await press(tree, 'open-document-library-button');

    expect(onOpenLibrary).toHaveBeenCalledTimes(1);
  });
});

describe('переименование', () => {
  it('у каждой заявки своя кнопка с названием в подписи', async () => {
    repository.listApplications.mockResolvedValue(APPLICATIONS);

    const { tree } = await renderScreen();

    expect(
      findByTestId(tree, 'application-row-0-rename').props.accessibilityLabel,
    ).toBe('Переименовать заявку ПМЖ Сербия');
  });

  it('зовёт onRename с этой заявкой — экран сам ничего не пишет', async () => {
    repository.listApplications.mockResolvedValue(APPLICATIONS);

    const { tree, onRename } = await renderScreen();
    await press(tree, 'application-row-1-rename');

    expect(onRename).toHaveBeenCalledWith(APPLICATIONS[1]);
  });
});

describe('удаление', () => {
  beforeEach(() => {
    repository.listApplications.mockResolvedValue(APPLICATIONS);
  });

  it('у каждой заявки своя кнопка с названием в подписи', async () => {
    const { tree } = await renderScreen();

    const button = findByTestId(tree, 'application-row-1-delete');
    expect(button.props.accessibilityLabel).toBe('Удалить заявку ВНЖ Сербия');
    expect(button.props.label).toBe('Удалить');
  });

  it('сначала диалог с числами — и ничего не удаляет', async () => {
    const { tree } = await renderScreen();

    await press(tree, 'application-row-0-delete');

    expect(repository.getApplicationDeletionImpact).toHaveBeenCalledWith(
      'app-2',
    );
    const [title, message] = (Alert.alert as jest.Mock).mock.calls[0] ?? [];
    expect(title).toBe('Удалить заявку «ПМЖ Сербия»?');
    expect(message).toContain('пункты чек-листа этой заявки (7)');
    expect(message).toContain('документы (2) останутся');
    expect(lastAlertButtons()[0]?.style).toBe('cancel');
    expect(repository.deleteApplication).not.toHaveBeenCalled();
  });

  it('после подтверждения строка пропадает, остальные остаются', async () => {
    const { tree } = await renderScreen();

    await press(tree, 'application-row-0-delete');
    await confirmDelete();

    expect(repository.deleteApplication).toHaveBeenCalledWith('app-2');
    expect(texts(tree)).not.toContain('ПМЖ Сербия');
    expect(texts(tree)).toEqual(expect.arrayContaining(['ВНЖ Сербия']));
  });

  it('отмена в диалоге ничего не удаляет', async () => {
    const { tree } = await renderScreen();

    await press(tree, 'application-row-0-delete');

    expect(repository.deleteApplication).not.toHaveBeenCalled();
    expect(texts(tree)).toEqual(expect.arrayContaining(['ПМЖ Сербия']));
  });

  it('ошибка удаления показывается, заявка остаётся в списке', async () => {
    repository.deleteApplication.mockRejectedValue(
      new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
    );
    const { tree } = await renderScreen();

    await press(tree, 'application-row-0-delete');
    await confirmDelete();

    expect(exists(tree, 'application-delete-error')).toBe(true);
    expect(texts(tree)).not.toContain('детали');
    expect(texts(tree)).toEqual(expect.arrayContaining(['ПМЖ Сербия']));
  });

  it('не удалось подсчитать — сообщение, диалога нет', async () => {
    repository.getApplicationDeletionImpact.mockRejectedValue(
      new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
    );
    const { tree } = await renderScreen();

    await press(tree, 'application-row-0-delete');

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(exists(tree, 'application-delete-error')).toBe(true);
  });

  it('пока идёт удаление, остальные действия недоступны', async () => {
    let finish: (value: unknown) => void = () => {};
    repository.deleteApplication.mockImplementation(
      () => new Promise(resolve => (finish = resolve)),
    );
    const { tree } = await renderScreen();

    await press(tree, 'application-row-0-delete');
    const confirm = lastAlertButtons().find(b => b.style === 'destructive');
    await ReactTestRenderer.act(async () => {
      confirm?.onPress?.();
      confirm?.onPress?.();
    });

    expect(repository.deleteApplication).toHaveBeenCalledTimes(1);
    expect(findByTestId(tree, 'application-row-0-delete').props.label).toBe(
      'Удаление…',
    );
    expect(findByTestId(tree, 'application-row-1-rename').props.disabled).toBe(
      true,
    );
    expect(findByTestId(tree, 'create-application-button').props.disabled).toBe(
      true,
    );

    await ReactTestRenderer.act(async () => {
      finish(undefined);
    });
    await flush();
  });
});
