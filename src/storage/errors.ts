/**
 * Типизированные ошибки слоя хранилища.
 *
 * Смысл в том, чтобы вызывающий код мог различить причину и показать
 * пользователю осмысленное сообщение, а не «что-то пошло не так».
 * Особенно это важно для ключа шифрования: по ADR-0008 недоступный ключ
 * означает недоступность всех документов, и пользователь должен узнать об
 * этом внятно и сразу.
 */

export const StorageErrorCode = {
  /** Keychain/Keystore недоступен: устройство заблокировано, сбой ОС и т.п. */
  KeychainUnavailable: 'keychain-unavailable',
  /** Ключ был записан, но прочитать его обратно не удалось (ADR-0008). */
  KeychainReadBackFailed: 'keychain-read-back-failed',
  /** Ключ существовал, но ОС его сбросила или он повреждён. */
  EncryptionKeyLost: 'encryption-key-lost',
  /** Путь выходит за пределы приватной директории приложения. */
  PathOutsideSandbox: 'path-outside-sandbox',
  /** Путь синтаксически недопустим (пустой, абсолютный, с нулевым байтом). */
  InvalidPath: 'invalid-path',
  /** Файл не найден. */
  FileNotFound: 'file-not-found',
  /** Сбой операции с БД. */
  DatabaseFailure: 'database-failure',
} as const;

export type StorageErrorCode =
  (typeof StorageErrorCode)[keyof typeof StorageErrorCode];

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string, cause?: unknown) {
    // cause передаём через options — стандартный способ не потерять
    // исходную ошибку, не склеивая её текст в сообщение.
    super(message, cause === undefined ? undefined : { cause });
    this.code = code;
    this.name = 'StorageError';
  }
}

export function isStorageError(
  error: unknown,
  code?: StorageErrorCode,
): error is StorageError {
  if (!(error instanceof StorageError)) {
    return false;
  }
  return code === undefined || error.code === code;
}
