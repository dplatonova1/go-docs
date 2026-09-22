/**
 * Репозиторий на настоящем SQLite.
 *
 * Все остальные тесты репозитория мокают драйвер и проверяют, какие
 * запросы уходят. Здесь наоборот: запросы выполняет настоящий движок
 * (`node:sqlite`, встроен в Node 22) поверх схемы из `MIGRATIONS`.
 * Проверяется то, что от мока не видно:
 *
 * - каскады `ON DELETE` — до сих пор они держались только на тексте SQL
 *   в `migrations.test.ts` («Отложенные обязательства» в CLAUDE.md);
 * - семантика `JOIN`/`GROUP BY` в подсчёте использований документа;
 * - псевдонимы колонок в запросе сборки пакета — на их расхождении с
 *   читателем уже ломалась кнопка «Собрать пакет».
 *
 * Движок не тот, что на устройстве (op-sqlite/SQLCipher), но SQL и
 * правила ссылочной целостности — те же.
 */

import { MIGRATIONS } from '../../../db/migrations';
import type {
  ApplicationId,
  ChecklistItemId,
  DocumentId,
  NonEmptyText,
} from '../model';
import {
  attachLibraryDocumentToItem,
  deleteApplication,
  deleteDocument,
  detachDocumentFromItem,
  getDocumentUsage,
  listLibraryDocuments,
  listPackageEntries,
  renameApplication,
} from '../repository';

jest.mock('../../../db/client', () => ({
  getDb: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../../db/ids', () => ({ newId: jest.fn() }));

// Файловое хранилище в этих сценариях не участвует: открепление и
// удаление заявки файлов не трогают, а удаление документа возвращает
// путь наружу.
jest.mock('../../../storage/fs', () => ({
  deleteFile: jest.fn(),
  toRelativePath: (value: string) => value,
}));

const client = require('../../../db/client');

// `require`, а не `import`: типов Node в проекте нет и ставить их ради
// одного теста незачем — это React Native, а не Node-приложение.
const { DatabaseSync } = require('node:sqlite');

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: (...params: never[]) => Record<string, unknown>[];
    run: (...params: never[]) => void;
  };
  close: () => void;
};

let db: SqliteDatabase;

type Params = readonly unknown[];

function execute(sql: string, params: Params = []) {
  const statement = db.prepare(sql);
  const values = params as never[];

  return /^\s*(SELECT|PRAGMA)/i.test(sql)
    ? { rows: statement.all(...values) as Record<string, unknown>[] }
    : (statement.run(...values), { rows: [] as Record<string, unknown>[] });
}

const APP_1 = 'app-1' as ApplicationId;
const APP_2 = 'app-2' as ApplicationId;

/** Заявка с двумя пунктами и одним общим документом на оба. */
function seed(): void {
  const now = '2026-09-23T10:00:00.000Z';

  execute(
    'INSERT INTO applications (id, title, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?)',
    [APP_1, 'ВНЖ Сербия', now, now, now],
  );
  execute(
    'INSERT INTO applications (id, title, created_at, updated_at, last_opened_at) VALUES (?, ?, ?, ?, ?)',
    [APP_2, 'ПМЖ', now, now, now],
  );

  for (const [id, application, label, position] of [
    ['i1', APP_1, 'Паспорт', 0],
    ['i2', APP_1, 'Фото', 1],
    ['i3', APP_2, 'Паспорт', 0],
  ] as const) {
    execute(
      "INSERT INTO checklist_items (id, application_id, label, position, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'attached', ?, ?)",
      [id, application, label, position, now, now],
    );
  }

  for (const [id, name, mime, hash] of [
    ['d1', 'Паспорт.pdf', 'application/pdf', 'hash-1'],
    ['d2', 'Фото.jpg', 'image/jpeg', 'hash-2'],
  ] as const) {
    execute(
      'INSERT INTO documents (id, original_filename, file_path, mime_type, size_bytes, content_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, `documents/${id}`, mime, 1024, hash, now, now],
    );
  }

  // d1 лежит в обеих заявках, d2 — только в первой.
  for (const [item, document] of [
    ['i1', 'd1'],
    ['i2', 'd2'],
    ['i3', 'd1'],
  ] as const) {
    execute(
      'INSERT INTO checklist_item_documents (checklist_item_id, document_id, attached_at) VALUES (?, ?, ?)',
      [item, document, now],
    );
  }
}

function countOf(table: string): number {
  const rows = execute(`SELECT COUNT(*) AS count FROM ${table}`).rows;
  return Number(rows[0]?.count ?? -1);
}

function statusOf(itemId: string): string {
  const rows = execute('SELECT status FROM checklist_items WHERE id = ?', [
    itemId,
  ]).rows;
  return String(rows[0]?.status ?? 'нет пункта');
}

beforeEach(() => {
  jest.resetAllMocks();

  db = new DatabaseSync(':memory:');
  // Без этого все ON DELETE CASCADE в схеме — просто комментарии.
  db.exec('PRAGMA foreign_keys = ON');

  for (const migration of MIGRATIONS) {
    for (const statement of migration.statements) {
      db.exec(statement);
    }
  }

  seed();

  client.getDb.mockResolvedValue({ execute });
  client.withTransaction.mockImplementation(
    async (fn: (tx: { execute: typeof execute }) => Promise<unknown>) => {
      db.exec('BEGIN');
      try {
        const result = await fn({ execute });
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  );
});

afterEach(() => {
  db.close();
});

describe('открепление документа от пункта', () => {
  it('снимает только связь: документ и его файл остаются', async () => {
    await detachDocumentFromItem('i1' as ChecklistItemId, 'd1' as DocumentId);

    expect(countOf('checklist_item_documents')).toBe(2);
    // Запись документа на месте, вместе с путём к файлу.
    const rows = execute('SELECT file_path FROM documents WHERE id = ?', [
      'd1',
    ]).rows;
    expect(rows[0]?.file_path).toBe('documents/d1');
  });

  it('пункт без файлов возвращается в «не прикреплено»', async () => {
    await detachDocumentFromItem('i1' as ChecklistItemId, 'd1' as DocumentId);

    expect(statusOf('i1')).toBe('pending');
    // У соседнего пункта свой файл — его статус не трогается.
    expect(statusOf('i2')).toBe('attached');
  });

  it('тот же документ в другой заявке не затронут', async () => {
    await detachDocumentFromItem('i1' as ChecklistItemId, 'd1' as DocumentId);

    expect(statusOf('i3')).toBe('attached');
    const links = execute(
      'SELECT checklist_item_id FROM checklist_item_documents WHERE document_id = ?',
      ['d1'],
    ).rows;
    expect(links.map(row => row.checklist_item_id)).toEqual(['i3']);
  });
});

describe('удаление заявки', () => {
  it('каскадом убирает её пункты и связи', async () => {
    await deleteApplication(APP_1);

    expect(countOf('applications')).toBe(1);
    // Остались только пункт и связь второй заявки.
    const items = execute('SELECT id FROM checklist_items').rows;
    expect(items.map(row => row.id)).toEqual(['i3']);
    const links = execute(
      'SELECT checklist_item_id FROM checklist_item_documents',
    ).rows;
    expect(links.map(row => row.checklist_item_id)).toEqual(['i3']);
  });

  it('документы не удаляет — ни те, что были только в ней', async () => {
    await deleteApplication(APP_1);

    // d2 лежал только в удалённой заявке и всё равно остался в библиотеке
    // (ADR-0016).
    const documents = execute('SELECT id FROM documents ORDER BY id').rows;
    expect(documents.map(row => row.id)).toEqual(['d1', 'd2']);
  });

  it('документ без связей виден в библиотеке', async () => {
    await deleteApplication(APP_1);

    const library = await listLibraryDocuments(null);
    expect(library.map(document => document.id)).toContain('d2');
  });
});

describe('удаление документа из библиотеки', () => {
  it('считает использования по заявкам и пунктам', async () => {
    const usage = await getDocumentUsage('d1' as DocumentId);

    expect(usage).toEqual({
      itemCount: 2,
      applications: [
        { applicationTitle: 'ВНЖ Сербия', itemCount: 1 },
        { applicationTitle: 'ПМЖ', itemCount: 1 },
      ],
    });
  });

  it('несколько пунктов одной заявки считаются одной строкой', async () => {
    await attachLibraryDocumentToItem(
      'i2' as ChecklistItemId,
      'd1' as DocumentId,
    );

    const usage = await getDocumentUsage('d1' as DocumentId);

    expect(usage.itemCount).toBe(3);
    expect(usage.applications).toEqual([
      { applicationTitle: 'ВНЖ Сербия', itemCount: 2 },
      { applicationTitle: 'ПМЖ', itemCount: 1 },
    ]);
  });

  it('неиспользуемый документ — ноль и пустой список', async () => {
    await deleteApplication(APP_1);
    await deleteApplication(APP_2);

    await expect(getDocumentUsage('d1' as DocumentId)).resolves.toEqual({
      itemCount: 0,
      applications: [],
    });
  });

  it('удаление снимает документ со всех чек-листов и возвращает путь', async () => {
    await expect(deleteDocument('d1' as DocumentId)).resolves.toBe(
      'documents/d1',
    );

    expect(countOf('documents')).toBe(1);
    // Каскад по document_id убрал обе связи, в обеих заявках.
    const links = execute(
      'SELECT document_id FROM checklist_item_documents',
    ).rows;
    expect(links.map(row => row.document_id)).toEqual(['d2']);
    // Пункты, оставшиеся без файлов, снова неотмечены.
    expect(statusOf('i1')).toBe('pending');
    expect(statusOf('i3')).toBe('pending');
    expect(statusOf('i2')).toBe('attached');
  });

  it('названия заявок берутся актуальные, а не запомненные', async () => {
    await renameApplication(APP_2, 'ПМЖ Сербия 2027' as NonEmptyText);

    const usage = await getDocumentUsage('d1' as DocumentId);

    expect(usage.applications.map(row => row.applicationTitle)).toContain(
      'ПМЖ Сербия 2027',
    );
  });
});

describe('данные для сборки пакета', () => {
  it('пункты идут по порядку, с документами и путями', async () => {
    const entries = await listPackageEntries(APP_1);

    expect(entries).toEqual([
      {
        itemId: 'i1',
        label: 'Паспорт',
        position: 0,
        documents: [
          {
            id: 'd1',
            name: 'Паспорт.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
            filePath: 'documents/d1',
          },
        ],
      },
      {
        itemId: 'i2',
        label: 'Фото',
        position: 1,
        documents: [
          {
            id: 'd2',
            name: 'Фото.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
            filePath: 'documents/d2',
          },
        ],
      },
    ]);
  });

  it('пункт без файлов остаётся в списке — реестру он нужен', async () => {
    await detachDocumentFromItem('i2' as ChecklistItemId, 'd2' as DocumentId);

    const entries = await listPackageEntries(APP_1);

    expect(entries.map(entry => entry.documents.length)).toEqual([1, 0]);
  });

  it('пункты чужой заявки не попадают', async () => {
    const entries = await listPackageEntries(APP_2);

    expect(entries.map(entry => entry.itemId)).toEqual(['i3']);
  });
});
