/**
 * Ошибки предметной области чек-листа.
 *
 * Отдельным модулем, а не в `repository.ts`: экран различает эти ошибки
 * через `instanceof`, и ему не нужно ради этого тянуть слой БД.
 */

/**
 * - `picker-failed` — системный выбор файла не открылся или упал;
 * - `copy-failed` — файл выбран, но получить его байты не удалось (часто —
 *   облачный файл без сети или удалённый в источнике);
 * - `unsupported` — источник не отдаёт файл в пригодном виде (виртуальный
 *   документ без экспорта).
 */
export type AttachmentErrorCode =
  | 'picker-failed'
  | 'copy-failed'
  | 'unsupported';

/** Сбой выбора файла — до того, как что-то записано в хранилище. */
export class AttachmentError extends Error {
  readonly code: AttachmentErrorCode;

  constructor(code: AttachmentErrorCode, cause?: unknown) {
    super(
      `Не удалось получить выбранный файл: ${code}`,
      cause === undefined ? undefined : { cause },
    );
    this.code = code;
    this.name = 'AttachmentError';
  }
}
