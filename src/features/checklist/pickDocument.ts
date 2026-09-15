/**
 * Выбор файла для прикрепления к пункту чек-листа.
 *
 * Типы файлов не ограничиваются: в чек-листах встречаются сканы, фото,
 * PDF, docx, выписки в произвольных форматах, и заранее угадать, что
 * потребует ведомство, нельзя.
 *
 * Сразу после выбора — `keepLocalCopy`: выбранный файл может лежать в
 * облаке (Google Drive, Google Photos), и его `content://` URI не
 * переживёт перезапуск приложения. Копия получает байты немедленно, пока
 * доступ к файлу выдан. Сохранять исходный URI нельзя.
 *
 * Виртуальные файлы Android (Google Docs, Sheets) разрешены и
 * экспортируются — в PDF, если источник это умеет. Иначе пользователь
 * видел бы в пикере документ, который почему-то нельзя выбрать.
 *
 * Не проверено на устройстве: iOS в режиме `import` сам кладёт копию во
 * временный каталог приложения, и её удаление остаётся за системой.
 */

import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
  type DocumentPickerResponse,
  type LocalCopyResponse,
} from '@react-native-documents/picker';

import { AttachmentError } from './errors';

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

function virtualExportType(picked: DocumentPickerResponse): string | undefined {
  const options = picked.convertibleToMimeTypes ?? [];
  return (
    options.find(option => option.mimeType === PREFERRED_VIRTUAL_EXPORT_TYPE)
      ?.mimeType ?? options[0]?.mimeType
  );
}

export async function pickDocument(): Promise<PickResult> {
  let picked: DocumentPickerResponse;

  try {
    [picked] = await pick({
      type: [types.allFiles],
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
