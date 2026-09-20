/**
 * Отпечаток содержимого файла.
 *
 * Проверяется на известных векторах SHA-256: от этой функции зависит
 * дедупликация, и «похоже, работает» здесь мало — разъехавшийся хэш
 * тихо создаст вторую копию файла или, хуже, склеит два разных файла.
 */

import { contentHashOf } from '../contentHash';

function bytesOf(text: string): Uint8Array {
  return Uint8Array.from(text, character => character.charCodeAt(0));
}

it('совпадает с эталонным SHA-256', () => {
  expect(contentHashOf(new Uint8Array())).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
  expect(contentHashOf(bytesOf('abc'))).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

it('одинаковые байты — одинаковый отпечаток, разные — разный', () => {
  const first = contentHashOf(bytesOf('паспорт'));

  expect(contentHashOf(bytesOf('паспорт'))).toBe(first);
  expect(contentHashOf(bytesOf('паспорт '))).not.toBe(first);
});

it('отпечаток — шестнадцатеричная строка фиксированной длины', () => {
  // Длина важна: колонка `documents.content_hash` под уникальным
  // индексом, и формат должен быть одинаковым у всех записей.
  const hash = contentHashOf(bytesOf('любой файл'));

  expect(hash).toMatch(/^[0-9a-f]{64}$/);
});
