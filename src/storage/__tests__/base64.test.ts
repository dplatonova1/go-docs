/**
 * Контрольные векторы base64 из RFC 4648, раздел 10.
 *
 * Реализация своя (в React Native нет ни btoa/atob, ни Buffer), поэтому
 * сверяемся со стандартом, а не с самими собой.
 */

import { base64ToBytes, bytesToBase64 } from '../base64';

const encoder = new TextEncoder();

const RFC_4648_VECTORS: ReadonlyArray<readonly [string, string]> = [
  ['', ''],
  ['f', 'Zg=='],
  ['fo', 'Zm8='],
  ['foo', 'Zm9v'],
  ['foob', 'Zm9vYg=='],
  ['fooba', 'Zm9vYmE='],
  ['foobar', 'Zm9vYmFy'],
];

describe('base64', () => {
  it.each(RFC_4648_VECTORS)(
    'кодирует %p согласно RFC 4648',
    (plain, expected) => {
      expect(bytesToBase64(encoder.encode(plain))).toBe(expected);
    },
  );

  it.each(RFC_4648_VECTORS)(
    'декодирует обратно %p согласно RFC 4648',
    (plain, encoded) => {
      expect(base64ToBytes(encoded)).toEqual(encoder.encode(plain));
    },
  );

  it('переживает круговой обход на произвольных байтах', () => {
    const bytes = new Uint8Array(512);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = (i * 7 + 13) % 256;
    }

    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('покрывает все 256 значений байта', () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) {
      bytes[i] = i;
    }

    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('игнорирует переносы строк во входных данных', () => {
    expect(base64ToBytes('Zm9v\nYmFy')).toEqual(encoder.encode('foobar'));
  });

  it('отвергает недопустимые символы', () => {
    expect(() => base64ToBytes('Zm9v!!!')).toThrow();
  });
});
