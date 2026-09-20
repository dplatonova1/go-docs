/**
 * Шрифт для титульной страницы-реестра.
 *
 * Стандартные шрифты PDF (Helvetica и прочие) знают только WinAnsi — на
 * кириллице `pdf-lib` просто бросит ошибку. Поэтому в документ
 * встраивается тот же Onest, которым набран интерфейс: он заведомо
 * содержит и кириллицу, и сербские буквы (см. `theme/typography.ts`).
 *
 * Файл шрифта лежит в ресурсах приложения, а не в песочнице, поэтому
 * читается в обход `storage/fs`: шифровать бандл приложения незачем, а
 * путей вне песочницы этот модуль больше не знает.
 */

import {
  MainBundlePath,
  readFile,
  readFileAssets,
} from '@dr.pogodin/react-native-fs';
import { Platform } from 'react-native';

import { base64ToBytes } from '../../storage/base64';
import { StorageError, StorageErrorCode } from '../../storage/errors';

const REGULAR = 'Onest-Regular.ttf';
const SEMIBOLD = 'Onest-SemiBold.ttf';

export type RegistryFontBytes = {
  readonly regular: Uint8Array;
  readonly semibold: Uint8Array;
};

/**
 * Android держит шрифты в `assets/fonts`, iOS — рядом с бинарником в
 * бандле. Оба пути ставит `npx react-native-asset`, см. README проекта.
 */
async function readFontFile(fileName: string): Promise<Uint8Array> {
  const base64 =
    Platform.OS === 'android'
      ? await readFileAssets(`fonts/${fileName}`, 'base64')
      : await readFile(`${MainBundlePath}/${fileName}`, 'base64');

  return base64ToBytes(base64);
}

export async function loadRegistryFonts(): Promise<RegistryFontBytes> {
  try {
    const [regular, semibold] = await Promise.all([
      readFontFile(REGULAR),
      readFontFile(SEMIBOLD),
    ]);

    return { regular, semibold };
  } catch (error) {
    // Шрифт лежит в самом приложении: если его нет, это не ситуация
    // пользователя, а сломанная сборка — и молчать о ней нельзя.
    throw new StorageError(
      StorageErrorCode.DatabaseFailure,
      'Не удалось прочитать шрифт для титульной страницы пакета',
      error,
    );
  }
}
