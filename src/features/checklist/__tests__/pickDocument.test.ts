/**
 * Выбор файла: разрешённые типы, локальная копия сразу после выбора,
 * ошибки пикера — в понятные коды.
 *
 * Платформа в тестах — iOS (умолчание jest-preset React Native), поэтому
 * в вызов пикера уходит список UTType. Android-список проверяется по
 * таблице `SELECTABLE_TYPES` отдельно: подменять `Platform.OS` ради
 * одного массива дороже, чем сверить сам массив.
 */

import { AttachmentError } from '../errors';
import { ATTACHABLE_MIME_TYPES } from '../model';
import { SELECTABLE_TYPES, pickDocument } from '../pickDocument';

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  keepLocalCopy: jest.fn(),
  errorCodes: {
    OPERATION_CANCELED: 'OPERATION_CANCELED',
    IN_PROGRESS: 'ASYNC_OP_IN_PROGRESS',
    UNABLE_TO_OPEN_FILE_TYPE: 'UNABLE_TO_OPEN_FILE_TYPE',
    NULL_PRESENTER: 'NULL_PRESENTER',
  },
  isErrorWithCode: (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error,
}));

const picker = require('@react-native-documents/picker');

const CLOUD_FILE = {
  uri: 'content://com.google.android.apps.docs.storage/document/acc%3D1%3Bdoc%3D42',
  name: 'Паспорт.pdf',
  type: 'application/pdf',
  nativeType: 'application/pdf',
  size: 2048,
  error: null,
  isVirtual: false,
  convertibleToMimeTypes: null,
  hasRequestedType: true,
};

const LOCAL_URI = 'file:///data/user/0/com.godocs/cache/UUID/picked-document';

function codeError(code: string) {
  return Object.assign(new Error(code), { code });
}

async function attachmentErrorCode(): Promise<string | undefined> {
  const error = await pickDocument().catch((e: unknown) => e);
  return error instanceof AttachmentError ? error.code : undefined;
}

beforeEach(() => {
  jest.resetAllMocks();
  picker.keepLocalCopy.mockResolvedValue([
    { status: 'success', sourceUri: CLOUD_FILE.uri, localUri: LOCAL_URI },
  ]);
});

it('только разрешённые типы, один файл, режим import', async () => {
  picker.pick.mockResolvedValue([CLOUD_FILE]);

  await pickDocument();

  expect(picker.pick).toHaveBeenCalledWith({
    type: ['public.jpeg', 'public.png', 'com.adobe.pdf'],
    mode: 'import',
    allowMultiSelection: false,
    allowVirtualFiles: true,
  });
});

describe('список разрешённых типов', () => {
  it('на Android — те же MIME-типы, что хранятся в базе', () => {
    // Иначе фильтр пикера и проверка при сборке пакета разойдутся.
    expect(SELECTABLE_TYPES.android).toEqual(ATTACHABLE_MIME_TYPES);
    expect(ATTACHABLE_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'application/pdf',
    ]);
  });

  it('HEIC не разрешён ни на одной платформе', () => {
    // Формат снимков iPhone по умолчанию: pdf-lib его не встраивает,
    // поэтому он не должен быть выбираемым (см. model.ts).
    const all: readonly string[] = [
      ...SELECTABLE_TYPES.android,
      ...SELECTABLE_TYPES.ios,
    ];

    expect(all).not.toContain('image/heic');
    expect(all).not.toContain('image/heif');
    expect(all).not.toContain('public.heic');
    // И никакого «любого изображения», под которое HEIC подпадает.
    expect(all).not.toContain('image/*');
    expect(all).not.toContain('public.image');
    expect(all).not.toContain('*/*');
  });
});

describe('типы вне JPEG, PNG и PDF', () => {
  const REJECTED = [
    ['HEIC с камеры iPhone', 'image/heic'],
    ['документ Word', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['простой текст', 'text/plain'],
    ['архив', 'application/zip'],
    ['тип неизвестен провайдеру', null],
  ] as const;

  it.each(REJECTED)('%s не проходит: unsupported, копия не делается', async (_name, mimeType) => {
    // Провайдер может проигнорировать фильтр (на Android это штатная
    // ситуация) — тогда библиотека помечает выбор `hasRequestedType:
    // false`, и дальше файл не идёт.
    picker.pick.mockResolvedValue([
      {
        ...CLOUD_FILE,
        type: mimeType,
        nativeType: mimeType,
        hasRequestedType: false,
      },
    ]);

    await expect(attachmentErrorCode()).resolves.toBe('unsupported');
    expect(picker.keepLocalCopy).not.toHaveBeenCalled();
  });

  it.each(['image/jpeg', 'image/png', 'application/pdf'] as const)(
    '%s проходит',
    async mimeType => {
      picker.pick.mockResolvedValue([
        { ...CLOUD_FILE, type: mimeType, nativeType: mimeType },
      ]);

      const result = await pickDocument();

      expect(result).toMatchObject({ status: 'picked', document: { mimeType } });
    },
  );
});

it('провайдер проигнорировал фильтр типов — unsupported, копия не делается', async () => {
  // Android: часть провайдеров отдаёт файл вне запрошенных типов.
  picker.pick.mockResolvedValue([
    {
      ...CLOUD_FILE,
      name: 'IMG_0042.HEIC',
      type: 'image/heic',
      nativeType: 'image/heic',
      hasRequestedType: false,
    },
  ]);

  await expect(attachmentErrorCode()).resolves.toBe('unsupported');
  expect(picker.keepLocalCopy).not.toHaveBeenCalled();
});

it('сразу делает локальную копию в кэше и отдаёт её, а не исходный URI', async () => {
  picker.pick.mockResolvedValue([CLOUD_FILE]);

  const result = await pickDocument();

  expect(picker.keepLocalCopy).toHaveBeenCalledWith({
    files: [{ uri: CLOUD_FILE.uri, fileName: 'picked-document' }],
    destination: 'cachesDirectory',
  });
  expect(result).toEqual({
    status: 'picked',
    document: {
      localUri: LOCAL_URI,
      name: 'Паспорт.pdf',
      mimeType: 'application/pdf',
    },
  });
});

it('имя копии не зависит от имени файла в источнике', async () => {
  picker.pick.mockResolvedValue([
    { ...CLOUD_FILE, name: '../../godocs.sqlite' },
  ]);

  await pickDocument();

  const [options] = picker.keepLocalCopy.mock.calls[0];
  expect(options.files[0].fileName).toBe('picked-document');
});

it('отмена выбора — не ошибка, копия не делается', async () => {
  picker.pick.mockRejectedValue(codeError('OPERATION_CANCELED'));

  await expect(pickDocument()).resolves.toEqual({ status: 'canceled' });
  expect(picker.keepLocalCopy).not.toHaveBeenCalled();
});

it('пикер не открылся — picker-failed', async () => {
  picker.pick.mockRejectedValue(codeError('ASYNC_OP_IN_PROGRESS'));
  await expect(attachmentErrorCode()).resolves.toBe('picker-failed');
});

it('тип файла не открывается — unsupported', async () => {
  picker.pick.mockRejectedValue(codeError('UNABLE_TO_OPEN_FILE_TYPE'));
  await expect(attachmentErrorCode()).resolves.toBe('unsupported');
});

it('копия не получилась (облако без сети) — copy-failed', async () => {
  picker.pick.mockResolvedValue([CLOUD_FILE]);
  picker.keepLocalCopy.mockResolvedValue([
    { status: 'error', sourceUri: CLOUD_FILE.uri, copyError: 'Network' },
  ]);

  await expect(attachmentErrorCode()).resolves.toBe('copy-failed');
});

it('keepLocalCopy упал — copy-failed', async () => {
  picker.pick.mockResolvedValue([CLOUD_FILE]);
  picker.keepLocalCopy.mockRejectedValue(new Error('IOException'));

  await expect(attachmentErrorCode()).resolves.toBe('copy-failed');
});

describe('виртуальные файлы Android', () => {
  function virtualFile(convertibleToMimeTypes: unknown[]) {
    return {
      ...CLOUD_FILE,
      name: 'Паспорт',
      isVirtual: true,
      convertibleToMimeTypes,
    };
  }

  it('экспортируются в PDF, если источник это умеет', async () => {
    picker.pick.mockResolvedValue([
      virtualFile([
        { mimeType: 'image/png', extension: 'png' },
        { mimeType: 'application/pdf', extension: 'pdf' },
      ]),
    ]);

    const result = await pickDocument();

    const [options] = picker.keepLocalCopy.mock.calls[0];
    expect(options.files[0].convertVirtualFileToType).toBe('application/pdf');
    expect(result).toMatchObject({ document: { mimeType: 'application/pdf' } });
  });

  it('без PDF берётся другой разрешённый формат', async () => {
    picker.pick.mockResolvedValue([
      virtualFile([{ mimeType: 'image/png', extension: 'png' }]),
    ]);

    const result = await pickDocument();

    const [options] = picker.keepLocalCopy.mock.calls[0];
    expect(options.files[0].convertVirtualFileToType).toBe('image/png');
    expect(result).toMatchObject({ document: { mimeType: 'image/png' } });
  });

  it('экспорт только в запрещённый формат — unsupported, а не обход фильтра', async () => {
    picker.pick.mockResolvedValue([
      virtualFile([
        { mimeType: 'text/plain', extension: 'txt' },
        { mimeType: 'image/heic', extension: 'heic' },
      ]),
    ]);

    await expect(attachmentErrorCode()).resolves.toBe('unsupported');
    expect(picker.keepLocalCopy).not.toHaveBeenCalled();
  });

  it('без вариантов экспорта — unsupported, копия не делается', async () => {
    picker.pick.mockResolvedValue([virtualFile([])]);

    await expect(attachmentErrorCode()).resolves.toBe('unsupported');
    expect(picker.keepLocalCopy).not.toHaveBeenCalled();
  });
});
