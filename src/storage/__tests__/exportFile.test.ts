/**
 * Область экспорта: имя файла и порядок «временный → целевой».
 *
 * Имя собирается из названия заявки, то есть из пользовательского
 * текста, и уходит в файловую систему и в чужое приложение через share
 * sheet — поэтому проверяется в первую очередь оно.
 */

import {
  deleteExport,
  exportDirectoryPath,
  finalizeExport,
  toExportFileName,
  writeTemporaryExport,
} from '../exportFile';

jest.mock('@dr.pogodin/react-native-fs', () => ({
  CachesDirectoryPath: '/data/user/0/io.github.dplatonova1.godocs/cache',
  DocumentDirectoryPath: '/data/user/0/io.github.dplatonova1.godocs/files',
  exists: jest.fn(),
  mkdir: jest.fn(),
  moveFile: jest.fn(),
  readDir: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
}));

const rnfs = require('@dr.pogodin/react-native-fs');

beforeEach(() => {
  jest.resetAllMocks();
  rnfs.exists.mockResolvedValue(true);
  rnfs.mkdir.mockResolvedValue(undefined);
  rnfs.writeFile.mockResolvedValue(undefined);
  rnfs.moveFile.mockResolvedValue(undefined);
  rnfs.unlink.mockResolvedValue(undefined);
});

describe('toExportFileName', () => {
  it('обычное название становится понятным именем файла', () => {
    expect(toExportFileName('ВНЖ Сербия')).toBe('Пакет — ВНЖ Сербия.pdf');
  });

  it('разделители путей вырезаются', () => {
    // Иначе название заявки уводило бы файл из каталога экспорта.
    const name = toExportFileName('../../../etc/passwd');

    expect(name).not.toContain('/');
    expect(name).not.toContain('..');
    expect(name.endsWith('.pdf')).toBe(true);
  });

  it('служебные символы файловой системы вырезаются', () => {
    const name = toExportFileName('ВНЖ: "Сербия" *2026* | 1?');

    for (const character of [':', '"', '*', '|', '?', '<', '>', '\\']) {
      expect(name).not.toContain(character);
    }
  });

  it('управляющие символы не попадают в имя', () => {
    const name = toExportFileName(`ВНЖ${String.fromCharCode(10)}Сербия`);

    expect(name).toBe('Пакет — ВНЖ Сербия.pdf');
  });

  it('длина ограничена', () => {
    const name = toExportFileName('я'.repeat(300));

    expect(Array.from(name).length).toBeLessThan(100);
  });

  it('от названия ничего не осталось — имя по умолчанию', () => {
    expect(toExportFileName('..')).toBe('Пакет документов.pdf');
    expect(toExportFileName('   ')).toBe('Пакет документов.pdf');
  });
});

describe('запись', () => {
  it('пишет во временный файл, а не сразу в целевой', async () => {
    const path = await writeTemporaryExport(new Uint8Array([1, 2, 3]));

    expect(path).toBe(`${exportDirectoryPath()}/package.tmp`);
    const [target, , encoding] = rnfs.writeFile.mock.calls[0];
    expect(target).toBe(path);
    expect(encoding).toBe('base64');
  });

  it('каталог создаётся, если его ещё нет', async () => {
    rnfs.exists.mockResolvedValue(false);

    await writeTemporaryExport(new Uint8Array([1]));

    expect(rnfs.mkdir).toHaveBeenCalledWith(exportDirectoryPath());
  });

  it('временный файл переименовывается в целевой', async () => {
    rnfs.exists.mockResolvedValue(false);

    const path = await finalizeExport('/cache/packages/package.tmp', 'Пакет.pdf');

    expect(rnfs.moveFile).toHaveBeenCalledWith(
      '/cache/packages/package.tmp',
      `${exportDirectoryPath()}/Пакет.pdf`,
    );
    expect(path).toBe(`${exportDirectoryPath()}/Пакет.pdf`);
  });

  it('прошлый пакет с тем же именем сначала удаляется', async () => {
    rnfs.exists.mockResolvedValue(true);

    await finalizeExport('/cache/packages/package.tmp', 'Пакет.pdf');

    expect(rnfs.unlink).toHaveBeenCalledWith(
      `${exportDirectoryPath()}/Пакет.pdf`,
    );
  });
});

it('уборка не падает, если файла уже нет', async () => {
  rnfs.unlink.mockRejectedValue(new Error('ENOENT'));

  await expect(deleteExport('/cache/packages/x.pdf')).resolves.toBeUndefined();
});
