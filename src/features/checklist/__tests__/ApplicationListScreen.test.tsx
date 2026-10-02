/**
 * Экран списка заявок: открыть, переименовать, создать.
 *
 * Порядок строк задаёт репозиторий (недавно открытые сверху) — экран его
 * не пересортировывает, иначе «последняя открытая» из ADR-0015
 * разъехалась бы между списком и запуском.
 *
 * Удаления в списке нет (решено 2026-10-02) — оно на экране чек-листа,
 * и проверяется там.
 */

import React from 'react';

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
}));

const repository = require('../repository');

const APPLICATIONS = [
  { id: 'app-2' as ApplicationId, title: 'ПМЖ Сербия' },
  { id: 'app-1' as ApplicationId, title: 'ВНЖ Сербия' },
];

beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

type Handlers = {
  onOpen?: jest.Mock;
  onRename?: jest.Mock;
  onCreate?: jest.Mock;
  isFocused?: boolean;
};

async function renderScreen({
  onOpen = jest.fn(),
  onRename = jest.fn(),
  onCreate = jest.fn(),
  isFocused = true,
}: Handlers = {}) {
  const tree = await render(
    <ApplicationListScreen
      isFocused={isFocused}
      onOpen={onOpen}
      onRename={onRename}
      onCreate={onCreate}
    />,
  );
  await flush();
  return {
    tree,
    onOpen,
    onRename,
    onCreate,
  };
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
  it('в списке кнопки удаления нет — заявку удаляют с её экрана', async () => {
    repository.listApplications.mockResolvedValue(APPLICATIONS);

    const { tree } = await renderScreen();

    expect(exists(tree, 'application-row-0-delete')).toBe(false);
    expect(exists(tree, 'application-row-1-delete')).toBe(false);
  });
});
