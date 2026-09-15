/**
 * Сообщения об ошибках для пользователя.
 *
 * По коду `StorageError`, а не по тексту исключения: текст пишется для
 * разработчика и может содержать детали, которые пользователю ничего не
 * скажут. `Record<StorageErrorCode, string>` заставляет tsc напомнить о
 * сообщении, когда в `errors.ts` появится новый код.
 */

import { StorageErrorCode, isStorageError } from '../../storage/errors';
import {
  ApplicationAlreadyExistsError,
  AttachmentError,
  type AttachmentErrorCode,
} from './errors';
import { MAX_ATTACHMENT_MEGABYTES } from './model';

const STORAGE_ERROR_MESSAGES = {
  [StorageErrorCode.KeychainUnavailable]:
    'Защищённое хранилище устройства недоступно. Разблокируйте устройство и попробуйте ещё раз.',
  [StorageErrorCode.KeychainReadBackFailed]:
    'Не удалось сохранить ключ шифрования на устройстве. Попробуйте ещё раз.',
  [StorageErrorCode.EncryptionKeyLost]:
    'Ключ шифрования на устройстве потерян, сохранённые данные недоступны.',
  [StorageErrorCode.KeyFormatUnsupported]:
    'Данные созданы более новой версией приложения. Обновите приложение.',
  [StorageErrorCode.CsprngUnavailable]:
    'Системный генератор случайных чисел недоступен. Перезапустите приложение.',
  [StorageErrorCode.PathOutsideSandbox]:
    'Внутренняя ошибка: недопустимый путь к файлу.',
  [StorageErrorCode.InvalidPath]:
    'Внутренняя ошибка: недопустимый путь к файлу.',
  [StorageErrorCode.FileNotFound]: 'Файл не найден.',
  [StorageErrorCode.FileCorrupted]:
    'Файл повреждён или не может быть расшифрован.',
  [StorageErrorCode.FileFormatUnsupported]:
    'Файл создан более новой версией приложения. Обновите приложение.',
  [StorageErrorCode.FileTooLarge]: `Файл больше ${MAX_ATTACHMENT_MEGABYTES} МБ. Уменьшите его — например, сожмите PDF или сделайте фото с меньшим разрешением — и попробуйте снова.`,
  [StorageErrorCode.DatabaseFailure]:
    'Не удалось обратиться к данным на устройстве. Попробуйте ещё раз.',
} as const satisfies Record<StorageErrorCode, string>;

const ATTACHMENT_ERROR_MESSAGES = {
  'picker-failed': 'Не удалось открыть выбор файла. Попробуйте ещё раз.',
  'copy-failed':
    'Не удалось получить файл. Если он хранится в облаке, откройте его в приложении облака, чтобы он загрузился на телефон, и попробуйте снова.',
  unsupported:
    'Этот файл нельзя прикрепить в таком виде. Сохраните его как PDF или изображение и попробуйте снова.',
} as const satisfies Record<AttachmentErrorCode, string>;

const APPLICATION_EXISTS_MESSAGE =
  'Заявка уже создана. Перезапустите приложение, чтобы открыть её.';

const UNKNOWN_ERROR_MESSAGE = 'Непредвиденная ошибка. Попробуйте ещё раз.';

export function describeError(error: unknown): string {
  if (error instanceof ApplicationAlreadyExistsError) {
    return APPLICATION_EXISTS_MESSAGE;
  }
  if (error instanceof AttachmentError) {
    return ATTACHMENT_ERROR_MESSAGES[error.code];
  }
  if (isStorageError(error)) {
    return STORAGE_ERROR_MESSAGES[error.code];
  }
  return UNKNOWN_ERROR_MESSAGE;
}
