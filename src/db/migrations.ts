/**
 * Миграции схемы базы данных.
 *
 * Правила:
 * - `version` монотонно растёт, начиная с 1;
 * - применённая миграция НИКОГДА не редактируется: на устройствах, где
 *   она уже отработала, правка не появится, и схема разъедется. Вместо
 *   правки заводится следующая миграция;
 * - каждый элемент `statements` — ровно один SQL-оператор: SQLite
 *   выполняет по одному за вызов.
 */

export type Migration = {
  /** Номер версии схемы. Уникален, монотонно растёт. */
  readonly version: number;
  /** Человекочитаемое имя — только для сообщений об ошибках, в БД не пишется. */
  readonly name: string;
  readonly statements: readonly string[];
};

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    statements: [
      // заявка (виза/ВНЖ/ПМЖ и т.д.)
      `CREATE TABLE applications (
         id TEXT PRIMARY KEY,
         title TEXT NOT NULL,
         country TEXT,
         application_type TEXT
           CHECK (application_type IS NULL
                  OR application_type IN ('visa', 'residence_permit', 'pmg', 'other')),
         status TEXT NOT NULL DEFAULT 'in_progress'
           CHECK (status IN ('in_progress', 'completed', 'archived')),
         created_at TEXT NOT NULL,
         updated_at TEXT NOT NULL
       )`,

      // пункты чек-листа внутри заявки
      `CREATE TABLE checklist_items (
         id TEXT PRIMARY KEY,
         application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
         label TEXT NOT NULL,
         position INTEGER NOT NULL,
         status TEXT NOT NULL DEFAULT 'pending'
           CHECK (status IN ('pending', 'attached', 'done')),
         created_at TEXT NOT NULL,
         updated_at TEXT NOT NULL
       )`,

      `CREATE INDEX idx_checklist_items_application_id
         ON checklist_items(application_id)`,

      // личная библиотека документов — НЕ привязана к одной заявке,
      // см. ADR-0010
      `CREATE TABLE documents (
         id TEXT PRIMARY KEY,
         original_filename TEXT,
         file_path TEXT NOT NULL,
         mime_type TEXT,
         size_bytes INTEGER,
         quality_flag TEXT                             -- проставляется в Фазе 2
           CHECK (quality_flag IS NULL OR quality_flag IN ('blurry', 'dark')),
         created_at TEXT NOT NULL,
         updated_at TEXT NOT NULL
       )`,

      // Один файл на диске — одна запись. Иначе две записи указывают на
      // один file_path, и удаление документа по одной из них оставляет
      // вторую ссылаться на несуществующий файл.
      `CREATE UNIQUE INDEX idx_documents_file_path
         ON documents(file_path)`,

      // связь many-to-many: один документ закрывает пункты в разных заявках
      `CREATE TABLE checklist_item_documents (
         checklist_item_id TEXT NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
         document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
         attached_at TEXT NOT NULL,
         PRIMARY KEY (checklist_item_id, document_id)
       )`,

      `CREATE INDEX idx_cid_document_id
         ON checklist_item_documents(document_id)`,

      // заготовка под Фазу 3, минимально
      `CREATE TABLE form_templates (
         id TEXT PRIMARY KEY,
         country TEXT,
         form_code TEXT NOT NULL,
         version INTEGER NOT NULL DEFAULT 1,
         source_format TEXT,
         fingerprint TEXT,
         schema_json TEXT,
         created_at TEXT NOT NULL,
         updated_at TEXT NOT NULL
       )`,
    ],
  },
];

/**
 * Отбирает миграции, которые нужно применить.
 *
 * Правило — «всё, что выше текущего максимума в schema_migrations».
 *
 * Отдельно ловится ситуация, которую это правило иначе пропустило бы
 * молча: миграция с номером не выше максимума, но отсутствующая среди
 * применённых. Так бывает при слиянии веток, когда миграция с меньшим
 * номером доезжает после большей. Схема на устройстве оказалась бы
 * неполной, а БД считалась бы актуальной — поэтому здесь ошибка, а не
 * тихий пропуск.
 *
 * Чистая функция: вынесена из `client.ts`, чтобы её можно было
 * проверить тестами без нативной части.
 */
export function selectPendingMigrations(
  all: readonly Migration[],
  appliedVersions: ReadonlySet<number>,
): readonly Migration[] {
  const maxApplied = appliedVersions.size === 0
    ? 0
    : Math.max(...appliedVersions);

  const skipped = all.filter(
    (migration) =>
      migration.version <= maxApplied && !appliedVersions.has(migration.version),
  );

  if (skipped.length > 0) {
    const versions = skipped.map((migration) => migration.version).join(', ');
    throw new Error(
      `Миграции ${versions} не применены, хотя схема уже на версии ` +
        `${maxApplied}. Скорее всего, миграция с меньшим номером попала в ` +
        'сборку после большей. Перенумеруйте её выше текущего максимума.',
    );
  }

  return [...all]
    .filter((migration) => migration.version > maxApplied)
    .sort((a, b) => a.version - b.version);
}
