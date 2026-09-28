/**
 * Файл настроек: чтение не падает никогда, запись сохраняет соседей.
 *
 * Сырой слой песочницы замокан — нативной файловой системы в jest нет.
 * Проверяется поведение вокруг неё: отсутствующий файл, испорченный
 * JSON, посторонние типы внутри и слияние при записи.
 */

jest.mock('../sandbox', () => ({
  FileEncoding: { Utf8: 'utf8', Base64: 'base64' },
  rawExists: jest.fn(),
  rawRead: jest.fn(),
  rawWrite: jest.fn(),
  toRelativePath: (value: string) => value,
}));

const sandbox = require('../sandbox');

const { readSettings, writeSetting } = require('../settings') as
  typeof import('../settings');

beforeEach(() => {
  jest.clearAllMocks();
  sandbox.rawWrite.mockResolvedValue(undefined);
});

it('без файла настроек — пустые настройки', async () => {
  sandbox.rawExists.mockResolvedValue(false);

  await expect(readSettings()).resolves.toEqual({});
  expect(sandbox.rawRead).not.toHaveBeenCalled();
});

it('испорченный файл читается как пустые настройки', async () => {
  // Приложение обязано запуститься: настройки — не данные пользователя.
  sandbox.rawExists.mockResolvedValue(true);
  sandbox.rawRead.mockResolvedValue('{ это не json');

  await expect(readSettings()).resolves.toEqual({});
});

it('сбой чтения не пробрасывается наружу', async () => {
  sandbox.rawExists.mockRejectedValue(new Error('нет доступа'));

  await expect(readSettings()).resolves.toEqual({});
});

it('значения, которые не строки, отбрасываются', async () => {
  sandbox.rawExists.mockResolvedValue(true);
  sandbox.rawRead.mockResolvedValue(
    JSON.stringify({ locale: 'en', nested: { a: 1 }, count: 3 }),
  );

  await expect(readSettings()).resolves.toEqual({ locale: 'en' });
});

it('массив вместо объекта — пустые настройки', async () => {
  sandbox.rawExists.mockResolvedValue(true);
  sandbox.rawRead.mockResolvedValue('[1, 2, 3]');

  await expect(readSettings()).resolves.toEqual({});
});

it('запись сохраняет уже лежащие рядом настройки', async () => {
  sandbox.rawExists.mockResolvedValue(true);
  sandbox.rawRead.mockResolvedValue(JSON.stringify({ theme: 'dark' }));

  await writeSetting('locale', 'ru');

  const [path, content, encoding] = sandbox.rawWrite.mock.calls[0];
  expect(path).toBe('settings.json');
  expect(JSON.parse(content)).toEqual({ theme: 'dark', locale: 'ru' });
  expect(encoding).toBe('utf8');
});

it('сбой записи виден вызывающему', async () => {
  // В отличие от чтения: молча потерянный выбор выглядел бы как
  // «приложение меня не слушается».
  sandbox.rawExists.mockResolvedValue(false);
  sandbox.rawWrite.mockRejectedValue(new Error('нет места'));

  await expect(writeSetting('locale', 'ru')).rejects.toThrow('нет места');
});
