/**
 * Отдаёт готовый пакет в системный share sheet.
 *
 * Файл лежит незашифрованным в кэше приложения — иначе его не смогло бы
 * открыть ни одно приложение, которому его передают (см.
 * `storage/exportFile.ts`). Провайдер `react-native-share` раздаёт файлы
 * именно из кэша, поэтому путь сборки и путь шаринга совпадают.
 *
 * После закрытия share sheet файл НЕ удаляется: получившее приложение
 * может читать его и после того, как вызов вернул управление. Уборка
 * идёт в начале следующей сборки, а кэш система чистит и сама.
 */

import Share from 'react-native-share';

import type { PackageBuildResult } from './types';

export async function sharePackage(
  result: PackageBuildResult,
): Promise<void> {
  await Share.open({
    url: `file://${result.filePath}`,
    type: 'application/pdf',
    filename: result.fileName,
    // Закрыть share sheet — обычное решение пользователя, а не ошибка.
    failOnCancel: false,
  });
}
