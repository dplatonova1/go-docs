/**
 * TODO: remove before Phase 1 — временный экран ручной проверки.
 *
 * Слой хранилища покрыт модульными тестами, но все они гоняют чистые
 * функции в Node. Ни Keychain, ни файловая система, ни SQLCipher ни разу
 * не запускались на реальном устройстве: нативная часть в тестах
 * замокана. Этот экран закрывает ровно этот разрыв.
 *
 * Каждая проверка показывает не «успех», а конкретное наблюдаемое
 * значение — отпечаток ключа, прочитанное содержимое, список таблиц.
 * Кнопка, которая пишет «ОК», не доказывает ничего.
 *
 * Ошибочные ветки проверяются тоже: удаление файла завершается попыткой
 * его прочитать, и ожидается отказ с кодом `file-not-found`.
 */

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { getDb, runMigrations } from '../../db/client';
import { base64ToBytes, bytesToBase64 } from '../../storage/base64';
import { StorageErrorCode, isStorageError } from '../../storage/errors';
import {
  deleteFile,
  readFile,
  saveFile,
  toRelativePath,
} from '../../storage/fs';
import { getOrCreateEncryptionKey } from '../../storage/keychain';

const TEST_FILE = toRelativePath('dev/smoke-test.txt');

const EXPECTED_TABLES = [
  'applications',
  'checklist_items',
  'documents',
  'checklist_item_documents',
  'form_templates',
] as const;

const LIST_TABLES_SQL =
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";

type CheckResult =
  | { readonly status: 'idle' }
  | { readonly status: 'running' }
  | { readonly status: 'ok'; readonly lines: readonly string[] }
  | { readonly status: 'fail'; readonly lines: readonly string[] };

const IDLE: CheckResult = { status: 'idle' };

function describeError(error: unknown): readonly string[] {
  if (isStorageError(error)) {
    return [`код: ${error.code}`, error.message];
  }
  if (error instanceof Error) {
    return [`${error.name}: ${error.message}`];
  }
  return [String(error)];
}

/**
 * Отпечаток ключа вместо самого ключа.
 *
 * Сравнить два запуска по первым восьми символам достаточно, а класть
 * ключ шифрования всех документов на экран, который попадёт на
 * скриншоты, не стоит.
 */
function fingerprint(key: string): string {
  return `длина ${key.length}, начало ${key.slice(0, 8)}…`;
}

function ResultView({ result }: { result: CheckResult }) {
  if (result.status === 'idle') {
    return null;
  }

  if (result.status === 'running') {
    return <Text style={styles.pending}>выполняется…</Text>;
  }

  const prefix = result.status === 'ok' ? 'OK —' : 'ОШИБКА —';

  return (
    <View style={styles.result}>
      {result.lines.map((line, index) => (
        <Text
          key={`${index}-${line}`}
          style={result.status === 'ok' ? styles.ok : styles.fail}
        >
          {index === 0 ? `${prefix} ${line}` : line}
        </Text>
      ))}
    </View>
  );
}

export function SmokeTestScreen() {
  const [keyResult, setKeyResult] = useState<CheckResult>(IDLE);
  const [fileResult, setFileResult] = useState<CheckResult>(IDLE);
  const [dbResult, setDbResult] = useState<CheckResult>(IDLE);

  // Ключ, полученный первой кнопкой, — чтобы вторая могла сверить.
  const [firstKey, setFirstKey] = useState<string | undefined>(undefined);
  // Что записали, чтобы сверить при чтении.
  const [written, setWritten] = useState<string | undefined>(undefined);

  /**
   * Запускает проверку и кладёт её исход в состояние.
   *
   * Синхронная намеренно: обработчик onPress не умеет ждать промис, а
   * ошибки здесь и так не выходят наружу — оба исхода становятся текстом
   * на экране.
   */
  const run = useCallback(
    (
      setter: (value: CheckResult) => void,
      action: () => Promise<readonly string[]>,
    ): void => {
      setter({ status: 'running' });
      action()
        .then((lines) => setter({ status: 'ok', lines }))
        .catch((error: unknown) =>
          setter({ status: 'fail', lines: describeError(error) }),
        );
    },
    [],
  );

  // --- 1. Ключ шифрования -------------------------------------------

  const onWriteKey = useCallback(() => {
    run(setKeyResult, async () => {
      const key = await getOrCreateEncryptionKey();
      setFirstKey(key);
      return [
        'ключ получен',
        fingerprint(key),
        'при первом запуске он создан, при последующих — прочитан',
      ];
    });
  }, [run]);

  const onReadKey = useCallback(() => {
    run(setKeyResult, async () => {
      const key = await getOrCreateEncryptionKey();

      if (firstKey === undefined) {
        return [
          'ключ получен',
          fingerprint(key),
          'сравнивать не с чем — сначала нажмите «Записать ключ»',
        ];
      }

      if (key !== firstKey) {
        throw new Error(
          'Повторный вызов вернул ДРУГОЙ ключ. Это означало бы потерю ' +
            'доступа ко всем ранее сохранённым документам.',
        );
      }

      return ['ключ совпал с предыдущим', fingerprint(key)];
    });
  }, [run, firstKey]);

  // --- 2. Файлы ------------------------------------------------------

  const onWriteFile = useCallback(() => {
    run(setFileResult, async () => {
      const text = `проверка записи ${new Date().toISOString()}`;
      const content = bytesToBase64(new TextEncoder().encode(text));

      await saveFile(TEST_FILE, content);
      setWritten(text);

      return ['файл записан', `путь: ${TEST_FILE}`, `содержимое: ${text}`];
    });
  }, [run]);

  const onReadFile = useCallback(() => {
    run(setFileResult, async () => {
      const content = await readFile(TEST_FILE);
      const text = new TextDecoder().decode(base64ToBytes(content));

      if (written !== undefined && text !== written) {
        throw new Error(
          `Прочитано не то, что записано. Записано: ${written}. ` +
            `Прочитано: ${text}`,
        );
      }

      return [
        written === undefined
          ? 'файл прочитан (записан в прошлом запуске)'
          : 'файл прочитан, содержимое совпало с записанным',
        text,
      ];
    });
  }, [run, written]);

  const onDeleteFile = useCallback(() => {
    run(setFileResult, async () => {
      await deleteFile(TEST_FILE);
      setWritten(undefined);

      // Проверяем и ошибочную ветку: после удаления чтение обязано
      // упасть с конкретным кодом, а не вернуть пустоту.
      try {
        await readFile(TEST_FILE);
      } catch (error) {
        if (isStorageError(error, StorageErrorCode.FileNotFound)) {
          return [
            'файл удалён',
            'повторное чтение корректно отказало: file-not-found',
          ];
        }
        throw error;
      }

      throw new Error(
        'Файл удалён, но чтение всё равно вернуло содержимое — ' +
          'удаление не сработало.',
      );
    });
  }, [run]);

  // --- 3. База данных ------------------------------------------------

  const onListTables = useCallback(() => {
    run(setDbResult, async () => {
      // Миграции запускаются здесь, а не при старте приложения: на этом
      // экране важно видеть, что именно они сделали.
      await runMigrations();

      const db = await getDb();
      const result = await db.execute(LIST_TABLES_SQL);

      const names = result.rows
        .map((row) => row.name)
        .filter((name): name is string => typeof name === 'string');

      const missing = EXPECTED_TABLES.filter((table) => !names.includes(table));

      if (missing.length > 0) {
        throw new Error(`Не хватает таблиц: ${missing.join(', ')}`);
      }

      return [
        `таблиц найдено: ${names.length}, все пять ожидаемых на месте`,
        ...names.map((name) => `• ${name}`),
      ];
    });
  }, [run]);

  return (
    <Screen testID="smoke-test-screen">
      <Text style={styles.title}>Проверка на устройстве</Text>
      <Text style={styles.note}>
        Временный экран Фазы 0. Удаляется перед Фазой 1.
      </Text>

      <View style={styles.block}>
        <Text style={styles.heading}>1. Ключ шифрования</Text>
        <Button
          label="Записать ключ"
          accessibilityLabel="Получить или создать ключ шифрования"
          testID="btn-write-key"
          onPress={onWriteKey}
        />
        <Button
          label="Прочитать ключ"
          accessibilityLabel="Прочитать ключ повторно и сверить с предыдущим"
          testID="btn-read-key"
          onPress={onReadKey}
        />
        <ResultView result={keyResult} />
      </View>

      <View style={styles.block}>
        <Text style={styles.heading}>
          2. Файлы (через fs.ts, с шифрованием)
        </Text>
        <Button
          label="Записать файл"
          accessibilityLabel="Записать тестовый файл в зашифрованном виде"
          testID="btn-write-file"
          onPress={onWriteFile}
        />
        <Button
          label="Прочитать файл"
          accessibilityLabel="Прочитать тестовый файл и расшифровать"
          testID="btn-read-file"
          onPress={onReadFile}
        />
        <Button
          label="Удалить файл"
          accessibilityLabel="Удалить тестовый файл и проверить, что он исчез"
          testID="btn-delete-file"
          onPress={onDeleteFile}
        />
        <ResultView result={fileResult} />
      </View>

      <View style={styles.block}>
        <Text style={styles.heading}>3. База данных</Text>
        <Button
          label="Показать список таблиц БД"
          accessibilityLabel="Применить миграции и показать список таблиц"
          testID="btn-list-tables"
          onPress={onListTables}
        />
        <ResultView result={dbResult} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  note: {
    fontSize: 13,
  },
  block: {
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
  },
  result: {
    gap: 2,
    paddingTop: 4,
  },
  pending: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  ok: {
    fontSize: 14,
  },
  fail: {
    fontSize: 14,
    fontWeight: '600',
  },
});
