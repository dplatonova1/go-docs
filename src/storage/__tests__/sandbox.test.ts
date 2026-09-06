/**
 * Тесты защиты от выхода за пределы приватной директории приложения.
 *
 * Это основной защитный механизм модуля: имена файлов приходят от
 * пользователя (он сам называет документы), и путь, собранный из них,
 * не должен позволять читать или писать за пределами песочницы.
 */

import { StorageErrorCode, isStorageError } from '../errors';
import { toRelativePath } from '../sandbox';

jest.mock('@dr.pogodin/react-native-fs', () => ({
  DocumentDirectoryPath: '/data/user/0/com.godocs/files',
  exists: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
}));

describe('toRelativePath', () => {
  it('принимает обычные относительные пути', () => {
    expect(toRelativePath('documents/passport.pdf')).toBe(
      'documents/passport.pdf',
    );
    expect(toRelativePath('file.jpg')).toBe('file.jpg');
  });

  it('нормализует обратные слэши', () => {
    expect(toRelativePath('documents\\passport.pdf')).toBe(
      'documents/passport.pdf',
    );
  });

  const traversalAttempts = [
    '../secrets',
    '../../etc/passwd',
    'documents/../../escape',
    'documents/../../../data/other.app/files',
    '..',
    'a/../../b',
    // с обратными слэшами — после нормализации это тот же выход наверх
    '..\\..\\escape',
  ];

  it.each(traversalAttempts)('отвергает выход из песочницы: %s', (attempt) => {
    expect(() => toRelativePath(attempt)).toThrow();

    try {
      toRelativePath(attempt);
    } catch (error) {
      expect(
        isStorageError(error, StorageErrorCode.PathOutsideSandbox),
      ).toBe(true);
    }
  });

  const invalidPaths = [
    ['пустая строка', ''],
    ['абсолютный путь unix', '/etc/passwd'],
    ['абсолютный путь после нормализации', '\\windows\\system32'],
    ['диск Windows', 'C:/Windows'],
    ['нулевой байт', 'file\0.pdf'],
  ] as const;

  it.each(invalidPaths)('отвергает недопустимый путь (%s)', (_label, value) => {
    expect(() => toRelativePath(value)).toThrow();
  });

  it('не считает выходом наверх имена, лишь начинающиеся с точек', () => {
    // «..» опасны только как отдельный сегмент; «..foo» — обычное имя.
    expect(toRelativePath('..foo/bar.pdf')).toBe('..foo/bar.pdf');
    expect(toRelativePath('file..pdf')).toBe('file..pdf');
  });
});
