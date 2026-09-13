/* eslint-disable no-bitwise -- UTF-8 кодирует символ группами бит по
   RFC 3629: сдвиги и маски здесь и есть алгоритм. Отключено только в
   этом файле. */

/**
 * Декодирование UTF-8.
 *
 * Своя реализация нужна потому, что Hermes даёт `TextEncoder`, но не
 * `TextDecoder`. Node в jest даёт оба, поэтому модульные тесты такую
 * ошибку не ловят — она всплывает только на устройстве. Чтобы её ловил
 * tsc, `TextDecoder` намеренно не объявлен в `src/globals.d.ts`.
 *
 * Режим строгий: некорректная последовательность — ошибка, а не молчаливая
 * замена на U+FFFD. Прочитанное содержимое сверяется с записанным, и
 * подменённый символ в нём хуже явного отказа.
 */

/** Сколько кодовых точек собирать перед сборкой строки: предел аргументов. */
const CHUNK_SIZE = 8192;

function invalidSequence(offset: number): Error {
  return new Error(`Некорректная последовательность UTF-8 в позиции ${offset}`);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  let out = '';
  let chunk: number[] = [];
  let i = 0;

  while (i < bytes.length) {
    const lead = bytes[i] ?? 0;
    let codePoint: number;
    let length: number;
    // Наименьшая кодовая точка для такой длины: всё, что меньше, —
    // «overlong»-запись, которую RFC 3629 запрещает.
    let minCodePoint: number;

    if (lead < 0x80) {
      codePoint = lead;
      length = 1;
      minCodePoint = 0;
    } else if (lead >= 0xc2 && lead <= 0xdf) {
      codePoint = lead & 0x1f;
      length = 2;
      minCodePoint = 0x80;
    } else if (lead >= 0xe0 && lead <= 0xef) {
      codePoint = lead & 0x0f;
      length = 3;
      minCodePoint = 0x800;
    } else if (lead >= 0xf0 && lead <= 0xf4) {
      codePoint = lead & 0x07;
      length = 4;
      minCodePoint = 0x10000;
    } else {
      throw invalidSequence(i);
    }

    if (i + length > bytes.length) {
      throw invalidSequence(i);
    }

    for (let k = 1; k < length; k += 1) {
      const continuation = bytes[i + k] ?? 0;
      if ((continuation & 0xc0) !== 0x80) {
        throw invalidSequence(i);
      }
      codePoint = (codePoint << 6) | (continuation & 0x3f);
    }

    const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;
    if (codePoint < minCodePoint || codePoint > 0x10ffff || isSurrogate) {
      throw invalidSequence(i);
    }

    chunk.push(codePoint);
    if (chunk.length === CHUNK_SIZE) {
      out += String.fromCodePoint(...chunk);
      chunk = [];
    }

    i += length;
  }

  return out + String.fromCodePoint(...chunk);
}
