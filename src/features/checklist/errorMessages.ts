/**
 * Сообщения об ошибках для пользователя.
 *
 * По коду `StorageError`, а не по тексту исключения: текст пишется для
 * разработчика и может содержать детали, которые пользователю ничего не
 * скажут. Полноту набора сторожит `satisfies Record<..., string>` в
 * словарях (`src/i18n/locales`): tsc напомнит о сообщении, когда в
 * `errors.ts` появится новый код.
 *
 * Словарь берётся в момент вызова, а не при загрузке модуля: язык
 * меняется в рантайме, и снятая заранее ссылка застыла бы на старом
 * (см. [`src/i18n/store.ts`](../../i18n/store.ts)).
 */

import { translations } from '../../i18n';
import { StorageErrorCode, isStorageError } from '../../storage/errors';
import { isPackageAssemblyError } from '../package/errors';
import { AttachmentError } from './errors';
import { MAX_ATTACHMENT_MEGABYTES } from './model';

export function describeError(error: unknown): string {
  const messages = translations().errors;

  if (isPackageAssemblyError(error)) {
    return messages.packageAssembly;
  }

  if (error instanceof AttachmentError) {
    return messages.attachment[error.code];
  }

  if (isStorageError(error)) {
    // Единственный код с подстановкой: предел размера задаёт модель
    // чек-листа, и словарь о ней не знает.
    if (error.code === StorageErrorCode.FileTooLarge) {
      return messages.storage[error.code](MAX_ATTACHMENT_MEGABYTES);
    }

    return messages.storage[error.code];
  }

  return messages.unknown;
}
