/**
 * Экран библиотеки документов в обоих режимах.
 *
 * Главное, что здесь проверяется: прикрепление из библиотеки не читает
 * файл (создаётся только связь), а удаление из библиотеки спрашивает
 * подтверждение со списком заявок, где документ используется.
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
import type { ChecklistItemId, DocumentId } from '../../checklist/model';
import { DocumentLibraryScreen } from '../DocumentLibraryScreen';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('../../checklist/repository', () => ({
  listLibraryDocuments: jest.fn(),
  getDocumentUsage: jest.fn(),
  attachLibraryDocumentToItem: jest.fn(),
  getDocumentThumbnail: jest.fn(),
  saveDocumentThumbnail: jest.fn(),
}));

// Миниатюру делает нативный модуль; здесь важно, что хук делает с
// результатом, а не сама картинка.
jest.mock('../thumbnail', () => ({
  ...jest.requireActual('../thumbnail'),
  makeThumbnail: jest.fn(),
}));

jest.mock('../deleteDocumentFromLibrary', () => ({
  deleteDocumentFromLibrary: jest.fn(),
}));

// Старым записям без миниатюры превью делается из файла — его чтение и
// расшифровка нативные. Хук проверяется через состояние строки.
jest.mock('../../../storage/fs', () => ({
  readFile: jest.fn(),
  toRelativePath: (value: string) => value,
}));

const repository = require('../../checklist/repository');
const remove = require('../deleteDocumentFromLibrary');
const fs = require('../../../storage/fs');
const { makeThumbnail } = require('../thumbnail');

const ITEM_ID = 'item-1' as ChecklistItemId;

const PDF = {
  id: 'doc-1' as DocumentId,
  name: 'Паспорт.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  createdAt: '2026-03-12T10:00:00.000Z',
  filePath: 'documents/doc-1',
  isAttachedToItem: false,
};

const PHOTO = {
  id: 'doc-2' as DocumentId,
  name: 'Фото.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  createdAt: '2026-03-10T10:00:00.000Z',
  filePath: 'documents/doc-2',
  isAttachedToItem: false,
};

beforeEach(() => {
  jest.resetAllMocks();
  repository.listLibraryDocuments.mockResolvedValue([PDF, PHOTO]);
  repository.getDocumentUsage.mockResolvedValue({
    itemCount: 3,
    applications: [
      { applicationTitle: 'ВНЖ Сербия', itemCount: 2 },
      { applicationTitle: 'ПМЖ', itemCount: 1 },
    ],
  });
  repository.attachLibraryDocumentToItem.mockResolvedValue('attached');
  remove.deleteDocumentFromLibrary.mockResolvedValue(undefined);
  fs.readFile.mockResolvedValue(new Uint8Array([9, 9, 9]));
  // По умолчанию миниатюра уже в базе (сделана при прикреплении).
  repository.getDocumentThumbnail.mockResolvedValue(new Uint8Array([1, 2, 3]));
  repository.saveDocumentThumbnail.mockResolvedValue(undefined);
  makeThumbnail.mockResolvedValue(new Uint8Array([4, 5, 6]));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

async function renderScreen(itemId: ChecklistItemId | null) {
  const onAttached = jest.fn();
  const tree = await render(
    <DocumentLibraryScreen itemId={itemId} isFocused onAttached={onAttached} />,
  );
  await flush();
  return { tree, onAttached };
}

function lastAlertButtons(): AlertButton[] {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return (calls[calls.length - 1]?.[2] ?? []) as AlertButton[];
}

async function confirmInDialog() {
  const confirm = lastAlertButtons().find(b => b.style === 'destructive');
  await ReactTestRenderer.act(async () => {
    confirm?.onPress?.();
  });
  await flush();
}

describe('просмотр библиотеки', () => {
  it('показывает имя и дату добавления каждого документа', async () => {
    const { tree } = await renderScreen(null);

    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        'Паспорт.pdf',
        'Добавлен 12 марта 2026',
        'Фото.jpg',
      ]),
    );
    expect(
      findByTestId(tree, 'library-document-0-name').props.accessibilityLabel,
    ).toBe('Документ 1 из 2: Паспорт.pdf, добавлен 12 марта 2026');
  });

  it('превью — миниатюра из базы, исходный файл не читается', async () => {
    const { tree } = await renderScreen(null);

    // PDF: миниатюры не бывает, в базу за ней даже не ходим.
    expect(exists(tree, 'library-document-0-preview')).toBe(false);
    expect(exists(tree, 'library-document-0-preview-placeholder')).toBe(true);
    expect(repository.getDocumentThumbnail).not.toHaveBeenCalledWith('doc-1');

    // JPEG: миниатюра из базы как data-URI, файл не расшифровывается.
    expect(
      findByTestId(tree, 'library-document-1-preview').props.source,
    ).toEqual({ uri: 'data:image/jpeg;base64,AQID' });
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('у старой записи без миниатюры она делается из файла один раз и сохраняется', async () => {
    repository.getDocumentThumbnail.mockResolvedValue(null);

    const { tree } = await renderScreen(null);

    expect(fs.readFile).toHaveBeenCalledWith('documents/doc-2');
    expect(makeThumbnail).toHaveBeenCalledWith(
      new Uint8Array([9, 9, 9]),
      'image/jpeg',
    );
    expect(repository.saveDocumentThumbnail).toHaveBeenCalledWith(
      'doc-2',
      new Uint8Array([4, 5, 6]),
    );
    expect(
      findByTestId(tree, 'library-document-1-preview').props.source,
    ).toEqual({ uri: 'data:image/jpeg;base64,BAUG' });
  });

  it('файл не читается — строка остаётся, на месте превью заглушка', async () => {
    repository.getDocumentThumbnail.mockResolvedValue(null);
    fs.readFile.mockRejectedValue(
      new StorageError(StorageErrorCode.FileNotFound, 'нет файла'),
    );

    const { tree } = await renderScreen(null);

    expect(exists(tree, 'library-document-1-preview')).toBe(false);
    expect(texts(tree)).toEqual(expect.arrayContaining(['Фото.jpg']));
  });

  it('пустая библиотека объясняет, откуда берутся файлы', async () => {
    repository.listLibraryDocuments.mockResolvedValue([]);

    const { tree } = await renderScreen(null);

    expect(exists(tree, 'document-library-empty')).toBe(true);
  });

  it('сбой чтения — сообщение и повтор', async () => {
    repository.listLibraryDocuments.mockRejectedValueOnce(
      new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
    );
    repository.listLibraryDocuments.mockResolvedValue([PDF]);

    const { tree } = await renderScreen(null);

    expect(exists(tree, 'document-library-error')).toBe(true);
    expect(texts(tree)).not.toContain('детали');

    await press(tree, 'document-library-retry-button');
    await flush();

    expect(texts(tree)).toEqual(expect.arrayContaining(['Паспорт.pdf']));
  });

  it('у всего интерактивного есть accessibilityLabel и testID', async () => {
    const { tree } = await renderScreen(null);

    expect(interactiveWithoutA11y(tree)).toEqual([]);
  });
});

describe('удаление из библиотеки', () => {
  it('диалог перечисляет заявки и пункты, где документ используется', async () => {
    const { tree } = await renderScreen(null);

    await press(tree, 'library-document-0-delete');

    expect(repository.getDocumentUsage).toHaveBeenCalledWith('doc-1');
    const [title, message] = (Alert.alert as jest.Mock).mock.calls[0] ?? [];
    expect(title).toBe('Удалить файл «Паспорт.pdf» из библиотеки?');
    expect(message).toContain('пунктам чек-листа (3)');
    expect(message).toContain('«ВНЖ Сербия» — пунктов: 2');
    expect(message).toContain('«ПМЖ» — пунктов: 1');
    expect(message).toContain('Из этих чек-листов он пропадёт');
    expect(lastAlertButtons()[0]?.style).toBe('cancel');
    expect(remove.deleteDocumentFromLibrary).not.toHaveBeenCalled();
  });

  it('документ нигде не используется — диалог говорит и об этом', async () => {
    repository.getDocumentUsage.mockResolvedValue({
      itemCount: 0,
      applications: [],
    });
    const { tree } = await renderScreen(null);

    await press(tree, 'library-document-0-delete');

    const [, message] = (Alert.alert as jest.Mock).mock.calls[0] ?? [];
    expect(message).toContain('не прикреплён ни к одному пункту');
  });

  it('после подтверждения строка пропадает', async () => {
    const { tree } = await renderScreen(null);

    await press(tree, 'library-document-0-delete');
    await confirmInDialog();

    expect(remove.deleteDocumentFromLibrary).toHaveBeenCalledWith('doc-1');
    expect(texts(tree)).not.toContain('Паспорт.pdf');
    expect(texts(tree)).toEqual(expect.arrayContaining(['Фото.jpg']));
  });

  it('отмена ничего не удаляет', async () => {
    const { tree } = await renderScreen(null);

    await press(tree, 'library-document-0-delete');

    expect(remove.deleteDocumentFromLibrary).not.toHaveBeenCalled();
    expect(texts(tree)).toEqual(expect.arrayContaining(['Паспорт.pdf']));
  });

  it('ошибка удаления показывается, документ остаётся', async () => {
    remove.deleteDocumentFromLibrary.mockRejectedValue(
      new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
    );
    const { tree } = await renderScreen(null);

    await press(tree, 'library-document-0-delete');
    await confirmInDialog();

    expect(exists(tree, 'document-library-action-error')).toBe(true);
    expect(texts(tree)).toEqual(expect.arrayContaining(['Паспорт.pdf']));
  });
});

describe('выбор файла для пункта', () => {
  it('прикрепляет без повторной загрузки файла и возвращает назад', async () => {
    const { tree, onAttached } = await renderScreen(ITEM_ID);

    await press(tree, 'library-document-0-attach');

    expect(repository.attachLibraryDocumentToItem).toHaveBeenCalledWith(
      ITEM_ID,
      'doc-1',
    );
    expect(onAttached).toHaveBeenCalledTimes(1);
  });

  it('у всего интерактивного есть accessibilityLabel и testID', async () => {
    // Режим выбора проверяется отдельно от просмотра: кнопки в строках
    // разные, и подпись «Прикрепить» без имени файла ничего не говорит.
    const { tree } = await renderScreen(ITEM_ID);

    expect(interactiveWithoutA11y(tree)).toEqual([]);
  });

  it('удаления из библиотеки в этом режиме нет', async () => {
    const { tree } = await renderScreen(ITEM_ID);

    expect(exists(tree, 'library-document-0-delete')).toBe(false);
    expect(exists(tree, 'library-document-0-attach')).toBe(true);
  });

  it('уже прикреплённый документ не предлагается снова', async () => {
    repository.listLibraryDocuments.mockResolvedValue([
      { ...PDF, isAttachedToItem: true },
    ]);

    const { tree } = await renderScreen(ITEM_ID);

    const button = findByTestId(tree, 'library-document-0-attach');
    expect(button.props.disabled).toBe(true);
    expect(button.props.label).toBe('Уже прикреплён');
  });

  it('гонка: документ успели прикрепить — сообщение, а не тихий успех', async () => {
    repository.attachLibraryDocumentToItem.mockResolvedValue(
      'already-attached',
    );
    const { tree, onAttached } = await renderScreen(ITEM_ID);

    await press(tree, 'library-document-0-attach');

    expect(exists(tree, 'document-library-action-error')).toBe(true);
    expect(onAttached).not.toHaveBeenCalled();
  });

  it('ошибка прикрепления показывается, экран остаётся', async () => {
    repository.attachLibraryDocumentToItem.mockRejectedValue(
      new StorageError(StorageErrorCode.DatabaseFailure, 'детали'),
    );
    const { tree, onAttached } = await renderScreen(ITEM_ID);

    await press(tree, 'library-document-0-attach');

    expect(exists(tree, 'document-library-action-error')).toBe(true);
    expect(texts(tree)).not.toContain('детали');
    expect(onAttached).not.toHaveBeenCalled();
  });
});
