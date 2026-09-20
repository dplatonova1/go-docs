/**
 * Выбор файла для прикрепления к пункту чек-листа.
 *
 * Выбрать можно только JPEG, PNG и PDF (`ATTACHABLE_MIME_TYPES`):
 * из них собирается итоговый пакет, а остальное пришлось бы
 * конвертировать на устройстве. Фильтр пикера — первый рубеж: файл
 * другого формата в приложение не попадает вообще, и отдельной ветки
 * «этот формат мы не умеем» ниже по течению не нужно.
 *
 * Сразу после выбора — `keepLocalCopy`: выбранный файл может лежать в
 * облаке (Google Drive, Google Photos), и его `content://` URI не
 * переживёт перезапуск приложения. Копия получает байты немедленно, пока
 * доступ к файлу выдан. Сохранять исходный URI нельзя.
 *
 * Виртуальные файлы Android (документ в облаке без локального
 * содержимого) разрешены и экспортируются — в PDF, если источник это
 * умеет, иначе в другой разрешённый формат. Google Docs и Sheets после
 * ограничения типов в пикере не появятся: у них свой MIME-тип. Но
 * провайдер может отдать виртуальным и обычный PDF, поэтому обработка
 * остаётся.
 *
 * Не проверено на устройстве: iOS в режиме `import` сам кладёт копию во
 * временный каталог приложения, и её удаление остаётся за системой.
 */

import { Platform } from 'react-native';

import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  type DocumentPickerResponse,
  type LocalCopyResponse,
} from '@react-native-documents/picker';

import { AttachmentError } from './errors';
import { ATTACHABLE_MIME_TYPES, isAttachableMimeType } from './model';

export type PickedDocument = {
  /**
   * `file://` локальной копии в кэше приложения. Открытый текст:
   * прочитать и удалить (`storage/localCopy`), не хранить.
   */
  readonly localUri: string;
  /** Имя в источнике — недоверенный текст, только для показа. */
  readonly name: string | null;
  readonly mimeType: string | null;
};

export type PickResult =
  | { readonly status: 'picked'; readonly document: PickedDocument }
  | { readonly status: 'canceled' };

/**
 * Имя файла копии. Не имя из источника: оно недоверенное, и путь в кэше
 * не должен от него зависеть. Уникальность обеспечивает каталог `<UUID>`,
 * который пикер создаёт под каждую копию.
 */
const LOCAL_COPY_FILE_NAME = 'picked-document';

const PREFERRED_VIRTUAL_EXPORT_TYPE = 'application/pdf';

/**
 * Чем ограничить выбор в пикере.
 *
 * Android фильтрует по MIME-типу, iOS — по UTType: строка `image/jpeg`
 * на iOS не совпадёт ни с чем, и пикер покажет пустой список. У
 * библиотеки есть готовая константа только для PDF (`types.pdf`), для
 * JPEG и PNG — нет, поэтому таблица целиком своя.
 *
 * Обе платформы перечислены явно, а не через `Platform.select`, чтобы
 * список для каждой можно было проверить тестом.
 */
export const SELECTABLE_TYPES = {
  android: ATTACHABLE_MIME_TYPES,
  // HEIC — `public.heic`; он наследует `public.image`, но не
  // `public.jpeg`, поэтому в этот список не попадает.
  ios: ['public.jpeg', 'public.png', 'com.adobe.pdf'],
} as const satisfies Record<'android' | 'ios', readonly string[]>;

/**
 * Формат, в который экспортировать виртуальный файл. PDF предпочтителен:
 * он сохраняет вёрстку. Варианты за пределами разрешённых типов не
 * рассматриваются — иначе ограничение обходилось бы через экспорт.
 */
function virtualExportType(picked: DocumentPickerResponse): string | undefined {
  const options = (picked.convertibleToMimeTypes ?? [])
    .map(option => option.mimeType)
    .filter(isAttachableMimeType);

  return (
    options.find(option => option === PREFERRED_VIRTUAL_EXPORT_TYPE) ??
    options[0]
  );
}

export async function pickDocument(): Promise<PickResult> {
  let picked: DocumentPickerResponse;

  try {
    [picked] = await pick({
      type: [
        ...(Platform.OS === 'ios'
          ? SELECTABLE_TYPES.ios
          : SELECTABLE_TYPES.android),
      ],
      mode: 'import',
      allowMultiSelection: false,
      allowVirtualFiles: true,
    });
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === errorCodes.OPERATION_CANCELED) {
        return { status: 'canceled' };
      }
      if (error.code === errorCodes.UNABLE_TO_OPEN_FILE_TYPE) {
        throw new AttachmentError('unsupported', error);
      }
    }
    throw new AttachmentError('picker-failed', error);
  }

  // Часть провайдеров на Android фильтр типов игнорирует, и выбрать
  // можно что угодно — библиотека сообщает об этом флагом. На iOS он
  // всегда true. Без этой проверки ограничение держалось бы только на
  // добросовестности провайдера.
  if (!picked.hasRequestedType) {
    throw new AttachmentError('unsupported');
  }

  const exportType =
    picked.isVirtual === true ? virtualExportType(picked) : undefined;

  if (picked.isVirtual === true && exportType === undefined) {
    throw new AttachmentError('unsupported');
  }

  let copy: LocalCopyResponse;
  try {
    [copy] = await keepLocalCopy({
      files: [
        {
          uri: picked.uri,
          fileName: LOCAL_COPY_FILE_NAME,
          ...(exportType === undefined
            ? {}
            : { convertVirtualFileToType: exportType }),
        },
      ],
      destination: 'cachesDirectory',
    });
  } catch (error) {
    throw new AttachmentError('copy-failed', error);
  }

  if (copy.status === 'error') {
    throw new AttachmentError('copy-failed', copy.copyError);
  }

  return {
    status: 'picked',
    document: {
      localUri: copy.localUri,
      name: picked.name,
      mimeType: exportType ?? picked.type,
    },
  };
}
