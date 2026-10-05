/**
 * Пункт чек-листа: какой файл показывается в плитке превью и пометка
 * детектора качества (ADR-0017, «Обновление»).
 *
 * Плитка заменена записывающей заглушкой: само превью (миниатюра, файл,
 * расшифровка) проверяет `library/__tests__`, а здесь важно только, какой
 * документ пункт ей отдал.
 */

import React from 'react';

import { cleanup, exists, render, texts } from '../../../test-utils/render';
import { ChecklistItemRow } from '../ChecklistItemRow';
import type {
  AttachedDocument,
  ChecklistItem,
  ChecklistItemId,
  DocumentId,
} from '../model';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

jest.mock('../../library/DocumentPreviewTile', () => ({
  DocumentPreviewTile: jest.fn(() => null),
}));

const { DocumentPreviewTile } = require('../../library/DocumentPreviewTile');

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

function document(
  id: string,
  mimeType: string,
  qualityFlag: AttachedDocument['qualityFlag'] = null,
): AttachedDocument {
  return {
    id: id as DocumentId,
    name: `${id}.file`,
    mimeType,
    sizeBytes: 1024,
    filePath: `documents/${id}`,
    qualityFlag,
  };
}

function item(documents: AttachedDocument[]): ChecklistItem {
  return {
    id: 'item-1' as ChecklistItemId,
    label: 'Паспорт',
    position: 0,
    status: documents.length > 0 ? 'attached' : 'pending',
    documents,
  };
}

async function renderRow(documents: AttachedDocument[]) {
  return render(
    <ChecklistItemRow
      item={item(documents)}
      index={0}
      total={1}
      isAttaching={false}
      detachingDocumentId={null}
      actionsDisabled={false}
      actionError={null}
      actionNotice={null}
      onAttach={jest.fn()}
      onPickFromLibrary={jest.fn()}
      onDetachFile={jest.fn()}
    />,
  );
}

/** Документ, который пункт последним отдал плитке превью. */
function tileDocument(): AttachedDocument | null {
  const calls = DocumentPreviewTile.mock.calls;
  return calls[calls.length - 1]?.[0]?.document ?? null;
}

describe('плитка превью', () => {
  it('первый файл, у которого есть превью, даже если он не первый', async () => {
    await renderRow([
      document('scan', 'application/pdf'),
      document('photo', 'image/jpeg'),
    ]);

    expect(tileDocument()?.id).toBe('photo');
  });

  it('превью нет ни у одного — первый файл: в плитке его заглушка', async () => {
    await renderRow([
      document('scan', 'application/pdf'),
      document('form', 'application/pdf'),
    ]);

    expect(tileDocument()?.id).toBe('scan');
  });

  it('без файлов — плитке нечего показывать', async () => {
    await renderRow([]);

    expect(tileDocument()).toBeNull();
  });
});

describe('пометка о качестве', () => {
  it('под именем файла, текстом — её прочтёт и скринридер', async () => {
    const tree = await renderRow([document('photo', 'image/jpeg', 'blurry')]);

    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Снимок, возможно, размыт']),
    );
    expect(exists(tree, 'checklist-item-0-file-0-quality')).toBe(true);
  });

  it('без пометки строки нет', async () => {
    const tree = await renderRow([document('photo', 'image/jpeg')]);

    expect(exists(tree, 'checklist-item-0-file-0-quality')).toBe(false);
  });
});
