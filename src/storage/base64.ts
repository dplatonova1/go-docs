/* eslint-disable no-bitwise -- base64 по определению работает с группами
   по 6 бит: сдвиги и маски здесь не «умничанье», а сам алгоритм из
   RFC 4648. Отключено только в этом файле. */

/**
 * Кодирование base64.
 *
 * Своя реализация нужна потому, что React Native не даёт ни `btoa`/`atob`,
 * ни `Buffer`, а `@noble/ciphers` предоставляет только hex (он удвоил бы
 * размер файлов на диске).
 *
 * Это кодирование, а не криптография: алгоритм полностью задан RFC 4648,
 * секретов не касается, проверяется контрольными векторами из стандарта.
 */

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const DECODE_TABLE: ReadonlyMap<string, number> = new Map(
  [...ALPHABET].map((char, index) => [char, index]),
);

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const remaining = bytes.length - i;

    out += ALPHABET[b0 >> 2];
    out += ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += remaining > 1 ? ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
    out += remaining > 2 ? ALPHABET[b2 & 0x3f] : '=';
  }

  return out;
}

export function base64ToBytes(value: string): Uint8Array {
  // Переносы строк допускаются: некоторые источники отдают base64
  // разбитым на строки.
  const cleaned = value.replace(/[\r\n\s]/g, '');
  // eslint-disable-next-line no-div-regex -- это не деление, а хвост '='
  const withoutPadding = cleaned.replace(/=+$/, '');

  const bytes = new Uint8Array(Math.floor((withoutPadding.length * 3) / 4));
  let byteIndex = 0;
  let buffer = 0;
  let bitsCollected = 0;

  for (const char of withoutPadding) {
    const value6 = DECODE_TABLE.get(char);

    if (value6 === undefined) {
      throw new Error(`Недопустимый символ в base64: ${JSON.stringify(char)}`);
    }

    buffer = (buffer << 6) | value6;
    bitsCollected += 6;

    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      bytes[byteIndex] = (buffer >> bitsCollected) & 0xff;
      byteIndex += 1;
    }
  }

  return bytes.subarray(0, byteIndex);
}
