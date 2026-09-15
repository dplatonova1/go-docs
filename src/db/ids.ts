/**
 * Идентификаторы записей БД.
 *
 * UUID v4 на `crypto.getRandomValues`, а не счётчик или время: записи
 * создаются на устройстве без сервера, и при будущей синхронизации
 * (Фаза 6) id с разных устройств не должны пересекаться.
 */

// Импорт ради побочного эффекта: ставит crypto.getRandomValues.
import 'react-native-get-random-values';

import { StorageError, StorageErrorCode } from '../storage/errors';

const UUID_BYTES = 16;

function toHex(byte: number): string {
  return byte.toString(16).padStart(2, '0');
}

export function newId(): string {
  if (
    typeof crypto === 'undefined' ||
    typeof crypto.getRandomValues !== 'function'
  ) {
    throw new StorageError(
      StorageErrorCode.CsprngUnavailable,
      'Генератор случайных чисел недоступен — не удалось создать id записи',
    );
  }

  const bytes = crypto.getRandomValues(new Uint8Array(UUID_BYTES));

  // Версия 4 и вариант RFC 4122 — чтобы это был валидный UUID, а не
  // просто 32 случайных hex-символа. Арифметикой, а не `& 0x0f | 0x40`
  // (линтер запрещает побитовые операции): для байта 0..255 результат тот
  // же — младшие 4 (6) бит сохраняются, старшие заменяются версией
  // (вариантом).
  bytes[6] = ((bytes[6] ?? 0) % 16) + 0x40;
  bytes[8] = ((bytes[8] ?? 0) % 64) + 0x80;

  const hex = Array.from(bytes, toHex).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
