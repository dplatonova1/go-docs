/**
 * Выбор файла: любые типы, локальная копия сразу после выбора, ошибки
 * пикера — в понятные коды.
 */

import { AttachmentError } from '../errors';
import { pickDocument } from '../pickDocument';

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  keepLocalCopy: jest.fn(),
  types: { allFiles: '*/*' },
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

it('любые типы файлов, один файл, режим import', async () => {
  picker.pick.mockResolvedValue([CLOUD_FILE]);

  await pickDocument();

  expect(picker.pick).toHaveBeenCalledWith({
    type: ['*/*'],
    mode: 'import',
    allowMultiSelection: false,
    allowVirtualFiles: true,
  });
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
  it('экспортируются в PDF, если источник это умеет', async () => {
    picker.pick.mockResolvedValue([
      {
        ...CLOUD_FILE,
        name: 'Резюме',
        type: 'application/vnd.google-apps.document',
        isVirtual: true,
        convertibleToMimeTypes: [
          { mimeType: 'text/plain', extension: 'txt' },
          { mimeType: 'application/pdf', extension: 'pdf' },
        ],
      },
    ]);

    const result = await pickDocument();

    const [options] = picker.keepLocalCopy.mock.calls[0];
    expect(options.files[0].convertVirtualFileToType).toBe('application/pdf');
    expect(result).toMatchObject({ document: { mimeType: 'application/pdf' } });
  });

  it('без вариантов экспорта — unsupported, копия не делается', async () => {
    picker.pick.mockResolvedValue([
      { ...CLOUD_FILE, isVirtual: true, convertibleToMimeTypes: [] },
    ]);

    await expect(attachmentErrorCode()).resolves.toBe('unsupported');
    expect(picker.keepLocalCopy).not.toHaveBeenCalled();
  });
});
