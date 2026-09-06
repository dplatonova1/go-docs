/**
 * Сырой доступ к приватной директории приложения — без шифрования.
 *
 * Слой существует отдельно от [`fs.ts`](./fs.ts), чтобы разорвать цикл:
 * зашифрованный `fs.ts` спрашивает ключ у `keychain.ts`, а `keychain.ts`
 * пишет служебный файл-отметку и не может зависеть от `fs.ts`.
 *
 * ВАЖНО: здесь содержимое НЕ шифруется. Документы пользователя писать
 * через этот модуль нельзя — только через `fs.ts`. Сюда допускаются
 * служебные файлы, не содержащие персональных данных.
 *
 * Два правила о путях, общие для всего хранилища:
 *
 * 1. **Только приватная песочница приложения.** Ни общего хранилища, ни
 *    внешних директорий: по ADR-0002 документы не покидают приложение, а
 *    по ADR-0009 разрешения на общее хранилище из манифеста удалены.
 * 2. **Наружу отдаются только относительные пути.** Абсолютный путь
 *    песочницы на iOS меняется между запусками (в нём UUID контейнера),
 *    поэтому сохранённый в БД абсолютный путь однажды перестанет
 *    открываться.
 */

import {
  DocumentDirectoryPath,
  exists,
  mkdir,
  readFile as fsReadFile,
  unlink,
  writeFile as fsWriteFile,
} from '@dr.pogodin/react-native-fs';

import { StorageError, StorageErrorCode } from './errors';

/**
 * Путь относительно корня песочницы. Branded-тип: обычную строку сюда не
 * подставить не глядя, её нужно провести через `toRelativePath()`, где
 * она будет проверена.
 */
export type RelativePath = string & { readonly __brand: 'RelativePath' };

/** Кодировка содержимого на диске. НЕ имеет отношения к шифрованию. */
export const FileEncoding = {
  Utf8: 'utf8',
  Base64: 'base64',
} as const;

export type FileEncoding = (typeof FileEncoding)[keyof typeof FileEncoding];

/**
 * Абсолютный путь к корню приватной директории приложения.
 *
 * ВАЖНО: результат нельзя сохранять — ни в БД, ни в файл, ни в состояние,
 * переживающее запуск приложения (см. правило 2 в шапке файла). Значение
 * годится только для немедленного использования: передать нативному
 * модулю, собрать путь к файлу БД и т.п.
 */
export function getAppFilesDir(): string {
  return DocumentDirectoryPath;
}

/**
 * Проверяет строку и помечает её как относительный путь внутри песочницы.
 *
 * Отвергает всё, чем можно выйти за пределы директории приложения:
 * абсолютные пути, `..`, нулевые байты. Это основная защита модуля —
 * если сюда попадёт путь, собранный из имени файла, которое пользователь
 * контролирует, обхода песочницы не произойдёт.
 */
export function toRelativePath(value: string): RelativePath {
  if (value.length === 0) {
    throw new StorageError(
      StorageErrorCode.InvalidPath,
      'Путь не может быть пустым',
    );
  }

  if (value.includes('\0')) {
    throw new StorageError(
      StorageErrorCode.InvalidPath,
      'Путь содержит нулевой байт',
    );
  }

  const normalized = value.replace(/\\/g, '/');

  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    throw new StorageError(
      StorageErrorCode.InvalidPath,
      'Ожидается путь относительно директории приложения, а не абсолютный',
    );
  }

  const segments = normalized.split('/');
  for (const segment of segments) {
    if (segment === '..') {
      throw new StorageError(
        StorageErrorCode.PathOutsideSandbox,
        'Путь выходит за пределы директории приложения',
      );
    }
  }

  return normalized as RelativePath;
}

/**
 * Разворачивает относительный путь в абсолютный для передачи в нативный
 * слой. Не экспортируется: абсолютные пути не покидают слой хранилища.
 */
function resolveInsideSandbox(relativePath: RelativePath): string {
  const base = getAppFilesDir();
  const absolute = `${base}/${relativePath}`;

  // Страховка на случай, если проверки выше однажды окажутся неполными:
  // после сборки пути ещё раз убеждаемся, что не вышли из песочницы.
  if (!absolute.startsWith(`${base}/`)) {
    throw new StorageError(
      StorageErrorCode.PathOutsideSandbox,
      'Путь выходит за пределы директории приложения',
    );
  }

  return absolute;
}

function parentDirectoryOf(absolutePath: string): string | undefined {
  const lastSlash = absolutePath.lastIndexOf('/');
  return lastSlash <= 0 ? undefined : absolutePath.slice(0, lastSlash);
}

/** Записывает содержимое как есть, без шифрования. */
export async function rawWrite(
  relativePath: RelativePath,
  content: string,
  encoding: FileEncoding,
): Promise<void> {
  const absolute = resolveInsideSandbox(relativePath);
  const parent = parentDirectoryOf(absolute);

  if (parent !== undefined && !(await exists(parent))) {
    await mkdir(parent);
  }

  await fsWriteFile(absolute, content, encoding);
}

/** Читает содержимое как есть, без расшифровки. */
export async function rawRead(
  relativePath: RelativePath,
  encoding: FileEncoding,
): Promise<string> {
  const absolute = resolveInsideSandbox(relativePath);

  if (!(await exists(absolute))) {
    throw new StorageError(
      StorageErrorCode.FileNotFound,
      `Файл не найден: ${relativePath}`,
    );
  }

  return fsReadFile(absolute, encoding);
}

/**
 * Удаляет файл. Отсутствие файла ошибкой не считается — удаление
 * идемпотентно, повторный вызов после сбоя не должен падать.
 */
export async function rawDelete(relativePath: RelativePath): Promise<void> {
  const absolute = resolveInsideSandbox(relativePath);

  if (!(await exists(absolute))) {
    return;
  }

  await unlink(absolute);
}

export async function rawExists(
  relativePath: RelativePath,
): Promise<boolean> {
  return exists(resolveInsideSandbox(relativePath));
}
