/**
 * Соединение с локальной БД и запуск миграций.
 *
 * Единственная точка входа к SQLite — остальной код не должен
 * импортировать `@op-engineering/op-sqlite` напрямую.
 *
 * Здесь только доступ к хранилищу: ни запросов предметной области, ни
 * схемы приложения. Таблицы Фазы 0 (`applications`, `documents`,
 * `checklist_items`, `form_templates`) добавляются как миграции в массив
 * `MIGRATIONS` ниже.
 */

import {
  isSQLCipher,
  open,
  type DB,
  type Transaction,
} from '@op-engineering/op-sqlite';

import { StorageError, StorageErrorCode } from '../storage/errors';
import { getOrCreateEncryptionKey } from '../storage/keychain';

const DATABASE_NAME = 'godocs.sqlite';

/**
 * Одна миграция схемы. Порядок задаётся полем `id`, оно же записывается в
 * таблицу учёта — по нему определяется, что уже применено.
 *
 * Правила: `id` монотонно растёт, применённая миграция никогда не
 * редактируется (иначе на устройствах, где она уже отработала, изменения
 * не появятся) — вместо правки заводится следующая.
 */
type Migration = {
  readonly id: number;
  readonly name: string;
  readonly statements: readonly string[];
};

const MIGRATIONS: readonly Migration[] = [
  // Схема предметной области добавляется сюда следующей задачей Фазы 0.
];

let connection: DB | undefined;
/** Защита от гонки: параллельные вызовы не должны открыть два соединения. */
let opening: Promise<DB> | undefined;

async function openConnection(): Promise<DB> {
  // База шифруется целиком (SQLCipher) тем же ключом, что и файлы
  // документов: метаданные заявок — названия, перечень документов,
  // даты — сами по себе рассказывают о человеке достаточно, чтобы не
  // оставлять их открытым текстом.
  //
  // SQLCipher включается на этапе сборки (`op-sqlite.sqlcipher` в
  // package.json). Если нативная часть собрана без него, параметр
  // encryptionKey может быть проигнорирован — и база окажется
  // незашифрованной, а мы будем считать иначе. Поэтому проверяем явно,
  // до открытия, и падаем вместо тихой работы без шифрования.
  if (!isSQLCipher()) {
    throw new StorageError(
      StorageErrorCode.DatabaseFailure,
      'Нативная часть op-sqlite собрана без SQLCipher — база не может ' +
        'быть зашифрована. Проверьте "op-sqlite": { "sqlcipher": true } ' +
        'в package.json и пересоберите приложение.',
    );
  }

  const encryptionKey = await getOrCreateEncryptionKey();

  try {
    return open({ name: DATABASE_NAME, encryptionKey });
  } catch (error) {
    throw new StorageError(
      StorageErrorCode.DatabaseFailure,
      'Не удалось открыть локальную базу данных',
      error,
    );
  }
}

/**
 * Возвращает единственное соединение с БД, открывая его при первом
 * обращении. Синглтон здесь не ради «красоты», а потому что несколько
 * открытых соединений к одному файлу SQLite — источник блокировок.
 *
 * Асинхронный, потому что перед открытием нужно получить ключ шифрования
 * из Keychain. Если ключ потерян, отсюда придёт `StorageError` с кодом
 * `encryption-key-lost` — с зашифрованной базой это означает, что данные
 * недоступны целиком, включая перечень документов (осознанный компромисс,
 * см. ADR-0002).
 */
export async function getDb(): Promise<DB> {
  if (connection !== undefined) {
    return connection;
  }

  opening ??= openConnection()
    .then((db) => {
      connection = db;
      return db;
    })
    .finally(() => {
      opening = undefined;
    });

  return opening;
}

/**
 * Закрывает соединение. Нужно в тестах и при полном сбросе данных;
 * в обычной работе приложения вызывать не требуется.
 */
export function closeDb(): void {
  if (connection === undefined) {
    return;
  }

  connection.close();
  connection = undefined;
}

/**
 * Открыто ли соединение. Нужно, чтобы UI мог отличить «база ещё не
 * открывалась» от «база недоступна», не пытаясь её открыть.
 */
export function isDbOpen(): boolean {
  return connection !== undefined;
}

/**
 * Выполняет функцию внутри транзакции и возвращает её результат.
 *
 * Если функция бросает исключение, op-sqlite откатывает транзакцию, и
 * исключение пробрасывается наружу — частично применённых изменений не
 * остаётся.
 */
export async function withTransaction<T>(
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  // op-sqlite отдаёт в транзакцию Promise<void>, поэтому результат
  // выносим через замыкание. Обёртка в объект, а не «голое» значение,
  // позволяет отличить «функция вернула undefined» от «не отработала».
  let outcome: { readonly value: T } | undefined;
  const db = await getDb();

  await db.transaction(async (tx) => {
    outcome = { value: await fn(tx) };
  });

  if (outcome === undefined) {
    throw new StorageError(
      StorageErrorCode.DatabaseFailure,
      'Транзакция завершилась без результата',
    );
  }

  return outcome.value;
}

async function ensureMigrationsTable(db: DB): Promise<void> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       id         INTEGER PRIMARY KEY,
       name       TEXT    NOT NULL,
       applied_at TEXT    NOT NULL
     )`,
  );
}

async function appliedMigrationIds(db: DB): Promise<ReadonlySet<number>> {
  const result = await db.execute('SELECT id FROM schema_migrations');
  const ids = new Set<number>();

  for (const row of result.rows) {
    const id = row.id;
    if (typeof id === 'number') {
      ids.add(id);
    }
  }

  return ids;
}

/**
 * Применяет непринятые миграции по возрастанию `id`.
 *
 * Каждая миграция выполняется в собственной транзакции вместе с записью
 * о её применении: если она упадёт на середине, в БД не останется
 * наполовину применённой схемы, помеченной как выполненная.
 *
 * Вызывать один раз при старте приложения, до первого обращения к данным.
 */
export async function runMigrations(): Promise<void> {
  const db = await getDb();

  await ensureMigrationsTable(db);
  const applied = await appliedMigrationIds(db);

  const pending = [...MIGRATIONS]
    .filter((migration) => !applied.has(migration.id))
    .sort((a, b) => a.id - b.id);

  for (const migration of pending) {
    try {
      await withTransaction(async (tx) => {
        for (const statement of migration.statements) {
          await tx.execute(statement);
        }

        await tx.execute(
          'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)',
          [migration.id, migration.name, new Date().toISOString()],
        );
      });
    } catch (error) {
      throw new StorageError(
        StorageErrorCode.DatabaseFailure,
        `Миграция ${migration.id} (${migration.name}) не применилась`,
        error,
      );
    }
  }
}
