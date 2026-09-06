/* eslint-disable no-bitwise -- XOR используется, чтобы намеренно испортить
   один бит и проверить, что подделка обнаруживается. */

/**
 * Проверки шифрования содержимого файлов.
 *
 * Сам алгоритм (AES-256-GCM) взят из аудированной `@noble/ciphers` и
 * здесь не проверяется. Проверяется наше использование: конверт, работа
 * с nonce и то, что подделка обнаруживается.
 */

import { decryptBytes, encryptBytes } from '../crypto';
import { StorageErrorCode, isStorageError } from '../errors';

const KEY_A =
  '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const KEY_B =
  'ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100';

const encoder = new TextEncoder();
const sample = encoder.encode('скан паспорта — персональные данные');

describe('encryptBytes / decryptBytes', () => {
  it('расшифровывает то, что зашифровало', () => {
    const restored = decryptBytes(encryptBytes(sample, KEY_A), KEY_A);
    expect(restored).toEqual(sample);
  });

  it('не оставляет открытый текст в результате', () => {
    const encrypted = encryptBytes(sample, KEY_A);
    // Ищем исходную последовательность байт в шифротексте.
    const haystack = Array.from(encrypted).join(',');
    const needle = Array.from(sample).join(',');
    expect(haystack).not.toContain(needle);
  });

  it('даёт разный результат при повторном шифровании (nonce не повторяется)', () => {
    const first = encryptBytes(sample, KEY_A);
    const second = encryptBytes(sample, KEY_A);
    expect(first).not.toEqual(second);
  });

  it('обнаруживает изменение шифротекста', () => {
    const encrypted = encryptBytes(sample, KEY_A);
    // Портим один бит в теле шифротекста (после версии и nonce).
    encrypted[20] = (encrypted[20] ?? 0) ^ 0x01;

    expect(() => decryptBytes(encrypted, KEY_A)).toThrow();
    try {
      decryptBytes(encrypted, KEY_A);
    } catch (error) {
      expect(isStorageError(error, StorageErrorCode.FileCorrupted)).toBe(true);
    }
  });

  it('обнаруживает подмену nonce', () => {
    const encrypted = encryptBytes(sample, KEY_A);
    encrypted[3] = (encrypted[3] ?? 0) ^ 0xff;

    expect(() => decryptBytes(encrypted, KEY_A)).toThrow();
  });

  it('не расшифровывается чужим ключом', () => {
    const encrypted = encryptBytes(sample, KEY_A);

    expect(() => decryptBytes(encrypted, KEY_B)).toThrow();
    try {
      decryptBytes(encrypted, KEY_B);
    } catch (error) {
      expect(isStorageError(error, StorageErrorCode.FileCorrupted)).toBe(true);
    }
  });

  it('отвергает обрезанный файл', () => {
    const encrypted = encryptBytes(sample, KEY_A);

    expect(() => decryptBytes(encrypted.subarray(0, 8), KEY_A)).toThrow();
  });

  it('отличает незнакомую версию формата от повреждения', () => {
    const encrypted = encryptBytes(sample, KEY_A);
    encrypted[0] = 99;

    try {
      decryptBytes(encrypted, KEY_A);
      throw new Error('ожидалась ошибка');
    } catch (error) {
      expect(
        isStorageError(error, StorageErrorCode.FileFormatUnsupported),
      ).toBe(true);
    }
  });

  it('работает с пустым содержимым', () => {
    const empty = new Uint8Array(0);
    expect(decryptBytes(encryptBytes(empty, KEY_A), KEY_A)).toEqual(empty);
  });
});
