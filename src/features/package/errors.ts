/**
 * Ошибка сборки пакета.
 *
 * Отдельный тип, потому что «непредвиденная ошибка» — плохой ответ на
 * сбой в pdf-lib, fontkit или нативной обработке снимка: по такому
 * тексту нельзя понять даже, в хранилище дело или в сборке. Сбои
 * отдельных документов сюда не попадают — они становятся строкой «не
 * включено» в реестре и пакет не срывают.
 *
 * Исходная ошибка сохраняется в `cause`: пользователю она не
 * показывается, но остаётся для отладки.
 */
export class PackageAssemblyError extends Error {
  readonly code = 'package-assembly-failed' as const;

  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'PackageAssemblyError';
  }
}

export function isPackageAssemblyError(
  error: unknown,
): error is PackageAssemblyError {
  return error instanceof PackageAssemblyError;
}
