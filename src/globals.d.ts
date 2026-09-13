/**
 * Декларации для того, что приходит в рантайм извне системы типов.
 */

/**
 * Полифилл, который ставит `crypto.getRandomValues` поверх системного
 * генератора случайных чисел ОС. Типов не поставляет, импортируется
 * только ради побочного эффекта.
 */
declare module 'react-native-get-random-values';

/**
 * `crypto` появляется в глобальной области после импорта полифилла выше.
 * React Native его сам не предоставляет, а `lib.dom` в tsconfig не
 * подключён (и не должен быть — это не браузер), поэтому объявляем
 * ровно ту часть, которой пользуемся.
 */
declare const crypto: {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
};

/**
 * Hermes предоставляет `TextEncoder`, но в типах React Native его нет, а
 * `lib.dom` мы не подключаем.
 *
 * `TextDecoder` здесь не объявлен намеренно: в Hermes его нет, и вызов
 * падает на устройстве с `ReferenceError`. Node в jest его даёт, поэтому
 * тесты такое не ловят — ловит только tsc, пока объявления нет.
 * Декодирование UTF-8 — `bytesToUtf8` из `src/storage/utf8.ts`.
 */
declare class TextEncoder {
  encode(input?: string): Uint8Array;
}
