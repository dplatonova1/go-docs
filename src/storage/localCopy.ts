/**
 * Локальные копии файлов, выбранных пикером, — до шифрования.
 *
 * Пикер отдаёт `content://` (Android) или временный `file://` (iOS), а сам
 * файл может лежать в облаке (Google Drive, Google Photos): такой URI
 * перестаёт открываться после перезапуска приложения. Поэтому сразу после
 * выбора `keepLocalCopy` копирует байты в `<кэш приложения>/<UUID>/<имя>`,
 * а этот модуль читает копию и удаляет её.
 *
 * ВАЖНО: копия — открытый текст, скан паспорта как есть. Она живёт ровно
 * столько, сколько нужно на чтение, и удаляется вместе со своим каталогом
 * `<UUID>`, даже если дальше что-то пошло не так. Хранить копию или путь к
 * ней нельзя; в песочницу документов пишется только зашифрованный файл
 * через [`fs.ts`](./fs.ts).
 *
 * Путь приходит из нативного модуля, но проверяется так же строго, как
 * пользовательский ввод: только `file://` ровно на два уровня внутри
 * каталога кэша, без `..`. Иначе ошибка в цепочке могла бы прочитать или
 * удалить что-то за пределами кэша — например, базу данных.
 */

import {
  CachesDirectoryPath,
  exists,
  readFile,
  stat,
  unlink,
} from '@dr.pogodin/react-native-fs';

import { base64ToBytes } from './base64';
import { StorageError, StorageErrorCode } from './errors';

const FILE_SCHEME = 'file://';

const PRIVATE_PREFIX = '/private';

export type CachedCopyLocation = {
  /** Абсолютный путь к файлу копии — только для немедленного чтения. */
  readonly filePath: string;
  /** Каталог `<UUID>`, созданный пикером под эту копию. */
  readonly copyDir: string;
};

/**
 * На iOS `/var` — ссылка на `/private/var`, и один и тот же каталог может
 * прийти и с префиксом, и без него. Сравниваются пути без префикса.
 */
function withoutPrivatePrefix(path: string): string {
  return path.startsWith(`${PRIVATE_PREFIX}/`)
    ? path.slice(PRIVATE_PREFIX.length)
    : path;
}

function invalidPath(message: string): StorageError {
  return new StorageError(StorageErrorCode.InvalidPath, message);
}

function outsideCache(): StorageError {
  return new StorageError(
    StorageErrorCode.PathOutsideSandbox,
    'Локальная копия выбранного файла лежит не там, где её создаёт пикер',
  );
}

/**
 * Проверяет URI локальной копии и возвращает пути к файлу и его каталогу.
 *
 * Ожидаемая раскладка — `<кэш>/<UUID>/<имя файла>`, её создают нативные
 * реализации `keepLocalCopy` на обеих платформах. Всё остальное — ошибка:
 * удалять каталог, в котором может оказаться что-то кроме копии, нельзя.
 */
export function locateCachedCopy(localUri: string): CachedCopyLocation {
  if (!localUri.startsWith(FILE_SCHEME)) {
    throw invalidPath('Локальная копия должна быть file:// URI');
  }

  let filePath: string;
  try {
    filePath = decodeURIComponent(localUri.slice(FILE_SCHEME.length));
  } catch {
    throw invalidPath('Путь локальной копии некорректно закодирован');
  }

  if (filePath.includes('\0')) {
    throw invalidPath('Путь локальной копии содержит нулевой байт');
  }

  const normalized = withoutPrivatePrefix(filePath);
  if (normalized.split('/').includes('..')) {
    throw outsideCache();
  }

  const cacheRoot = withoutPrivatePrefix(
    CachesDirectoryPath.replace(/\/+$/, ''),
  );
  if (!normalized.startsWith(`${cacheRoot}/`)) {
    throw outsideCache();
  }

  const segments = normalized.slice(cacheRoot.length + 1).split('/');
  if (segments.length !== 2 || segments.some(part => part.length === 0)) {
    throw outsideCache();
  }

  return {
    filePath,
    copyDir: filePath.slice(0, filePath.lastIndexOf('/')),
  };
}

/**
 * Читает локальную копию целиком.
 *
 * Размер проверяется до чтения: файл читается в память полностью (base64
 * → байты → шифротекст → base64), пиковое потребление в несколько раз
 * больше самого файла.
 *
 * @throws StorageError `file-too-large`, `file-not-found`, ошибки пути.
 */
export async function readCachedCopy(
  localUri: string,
  maxBytes: number,
): Promise<Uint8Array> {
  const { filePath } = locateCachedCopy(localUri);

  let size: number;
  try {
    size = Number((await stat(filePath)).size);
  } catch (error) {
    throw new StorageError(
      StorageErrorCode.FileNotFound,
      'Локальная копия выбранного файла не найдена',
      error,
    );
  }

  if (!Number.isFinite(size) || size > maxBytes) {
    throw new StorageError(
      StorageErrorCode.FileTooLarge,
      `Файл размером ${size} байт больше предела ${maxBytes} байт`,
    );
  }

  const bytes = base64ToBytes(await readFile(filePath, 'base64'));

  // Файл мог вырасти между stat и чтением — предел проверяется и по факту.
  if (bytes.length > maxBytes) {
    throw new StorageError(
      StorageErrorCode.FileTooLarge,
      `Файл размером ${bytes.length} байт больше предела ${maxBytes} байт`,
    );
  }

  return bytes;
}

/**
 * Удаляет локальную копию вместе с её каталогом `<UUID>`.
 *
 * Никогда не бросает: вызывается из `finally`, и ошибка удаления не должна
 * подменить собой исходную ошибку. Недоудалённую копию в итоге уберёт ОС
 * при очистке кэша — это хуже немедленного удаления, но не утечка наружу:
 * кэш приватен для приложения.
 */
export async function deleteCachedCopy(localUri: string): Promise<void> {
  let location: CachedCopyLocation;
  try {
    location = locateCachedCopy(localUri);
  } catch {
    // Путь не прошёл проверку — удалять по нему ничего нельзя.
    return;
  }

  try {
    if (await exists(location.copyDir)) {
      await unlink(location.copyDir);
    }
  } catch {
    // См. комментарий к функции.
  }
}
