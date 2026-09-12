/**
 * Соединение с локальной БД и запуск миграций.
 *
 * Единственная точка входа к SQLite — остальной код не должен
 * импортировать `@op-engineering/op-sqlite` напрямую.
 *
 * Здесь только доступ к хранилищу: ни запросов предметной области, ни
 * схемы приложения. Сама схема живёт в [`migrations.ts`](./migrations.ts).
 */

import {
  isSQLCipher,
  open,
  type DB,
  type Transaction,
} from '@op-engineering/op-sqlite';

import { StorageError, StorageErrorCode } from '../storage/errors';
import { getOrCreateEncryptionKey } from '../storage/keychain';
import {
  MIGRATIONS,
  selectPendingMigrations,
  type Migration,
} from './migrations';

const DATABASE_NAME = 'godocs.sqlite';

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

  let db: DB;

  try {
    db = open({ name: DATABASE_NAME, encryptionKey });
  } catch (error) {
    throw new StorageError(
      StorageErrorCode.DatabaseFailure,
      'Не удалось открыть локальную базу данных',
      error,
    );
  }

  await enableForeignKeys(db);

  return db;
}

/**
 * Включает проверку внешних ключей.
 *
 * В SQLite она выключена по умолчанию, и op-sqlite собран без
 * `SQLITE_DEFAULT_FOREIGN_KEYS`. Без этого вызова все `REFERENCES ...
 * ON DELETE CASCADE` в схеме — просто комментарии: удаление заявки не
 * удалит её пункты чек-листа, а вставить пункт с несуществующим
 * `application_id` можно будет беспрепятственно.
 *
 * Два важных свойства этого PRAGMA:
 * - действует на соединение, а не на файл БД, поэтому выполняется при
 *   каждом открытии;
 * - внутри транзакции он не работает, поэтому вызывается до миграций.
 *
 * Результат проверяется: молча не сработавший PRAGMA — это тихо
 * отключённая целостность данных.
 */
async function enableForeignKeys(db: DB): Promise<void> {
  try {
    await db.execute('PRAGMA foreign_keys = ON');
    const result = await db.execute('PRAGMA foreign_keys');
    const enabled = result.rows[0]?.foreign_keys;

    if (enabled !== 1) {
      throw new Error(`PRAGMA foreign_keys вернул ${String(enabled)}`);
    }
  } catch (error) {
    throw new StorageError(
      StorageErrorCode.DatabaseFailure,
      'Не удалось включить проверку внешних ключей — целостность связей ' +
        'между таблицами не гарантируется',
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
       version    INTEGER PRIMARY KEY,
       applied_at TEXT NOT NULL
     )`,
  );
}

async function appliedVersions(db: DB): Promise<ReadonlySet<number>> {
  const result = await db.execute('SELECT version FROM schema_migrations');
  const versions = new Set<number>();

  for (const row of result.rows) {
    const version = row.version;
    if (typeof version === 'number') {
      versions.add(version);
    }
  }

  return versions;
}

/**
 * Применяет миграции с номером выше текущей версии схемы.
 *
 * Идемпотентна: повторный вызов, когда всё применено, не делает ничего.
 *
 * Каждая миграция выполняется в собственной транзакции вместе с записью
 * о применении. Поэтому упавшая на середине миграция откатывается
 * целиком и не помечается применённой, а уже прошедшие остаются — при
 * следующем запуске работа продолжится с места остановки.
 *
 * Вызывать один раз при старте приложения, до первого обращения к данным.
 */
export async function runMigrations(): Promise<void> {
  const db = await getDb();

  await ensureMigrationsTable(db);

  let pending: readonly Migration[];

  try {
    pending = selectPendingMigrations(MIGRATIONS, await appliedVersions(db));
  } catch (error) {
    throw new StorageError(
      StorageErrorCode.DatabaseFailure,
      error instanceof Error ? error.message : 'Не удалось определить ' +
        'список миграций к применению',
    );
  }

  for (const migration of pending) {
    try {
      await withTransaction(async (tx) => {
        for (const statement of migration.statements) {
          await tx.execute(statement);
        }

        await tx.execute(
          'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
          [migration.version, new Date().toISOString()],
        );
      });
    } catch (error) {
      throw new StorageError(
        StorageErrorCode.DatabaseFailure,
        `Миграция ${migration.version} (${migration.name}) не применилась`,
        error,
      );
    }
  }
}
