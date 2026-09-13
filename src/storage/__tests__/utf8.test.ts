/**
 * Декодирование UTF-8 сверяется с `TextDecoder` из Node как с эталоном.
 *
 * На устройстве `TextDecoder` нет (Hermes), поэтому он объявлен только
 * здесь, локально, а не в `src/globals.d.ts`.
 */

import { bytesToUtf8 } from '../utf8';

type ReferenceDecoder = {
  decode(input: Uint8Array): string;
};

const { TextDecoder: NodeTextDecoder } = globalThis as unknown as {
  TextDecoder: new (
    label: string,
    options: { fatal: boolean },
  ) => ReferenceDecoder;
};

const reference = new NodeTextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();

describe('bytesToUtf8', () => {
  it.each([
    ['пустая строка', ''],
    ['ASCII', 'passport 123'],
    ['кириллица', 'проверка записи 2026-09-13T21:47:00.000Z'],
    ['сербская латиница и кириллица', 'Ђорђе Đorđe'],
    ['эмодзи вне BMP', '📄✅'],
    ['граница 1 байт', ''],
    ['граница 2 байта', '߿'],
    ['граница 3 байта', 'ࠀ￿'],
    ['граница 4 байта', '\u{10000}\u{10ffff}'],
  ])('%s совпадает с эталоном', (_name, text) => {
    const bytes = encoder.encode(text);

    expect(bytesToUtf8(bytes)).toBe(text);
    expect(bytesToUtf8(bytes)).toBe(reference.decode(bytes));
  });

  it('длинный текст больше одной порции собирается целиком', () => {
    const text = 'я📄a'.repeat(10_000);

    expect(bytesToUtf8(encoder.encode(text))).toBe(text);
  });

  it.each([
    ['одиночный байт продолжения', [0x80]],
    ['overlong-запись 2 байта', [0xc0, 0x80]],
    ['overlong-запись 3 байта', [0xe0, 0x80, 0x80]],
    ['overlong-запись 4 байта', [0xf0, 0x80, 0x80, 0x80]],
    ['суррогат', [0xed, 0xa0, 0x80]],
    ['больше U+10FFFF', [0xf4, 0x90, 0x80, 0x80]],
    ['недопустимый ведущий байт', [0xf5, 0x80, 0x80, 0x80]],
    ['обрыв 2-байтной последовательности', [0xd0]],
    ['обрыв 3-байтной последовательности', [0xe2, 0x82]],
    ['ASCII вместо байта продолжения', [0xd0, 0x41]],
  ])('%s — ошибка', (_name, raw) => {
    const bytes = new Uint8Array(raw);

    // Сначала убеждаемся, что вектор действительно некорректен.
    expect(() => reference.decode(bytes)).toThrow();
    expect(() => bytesToUtf8(bytes)).toThrow(/UTF-8/);
  });
});
