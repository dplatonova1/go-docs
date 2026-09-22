/**
 * `TextDecoder` для Hermes.
 *
 * Hermes даёт `TextEncoder`, но не `TextDecoder` — об этом же написано в
 * [`storage/utf8.ts`](../storage/utf8.ts), где для своих нужд
 * реализована ручная раскодировка UTF-8. Для себя полифилл не нужен;
 * он нужен чужим библиотекам сборки пакета:
 *
 * - `@cantoo/pdf-lib` читает строки в `utf-8` и `latin1`;
 * - `@cantoo/fontkit` разбирает таблицы имён шрифта и просит кодировки,
 *   записанные в самом шрифте, — `ascii`, `macintosh`, `utf-16be` и
 *   другие однобайтовые.
 *
 * Поэтому полифилл нужен полный, с таблицами кодировок, а не только
 * UTF-8. Без него сборка падает уже на встраивании шрифта, а ошибка
 * выглядит как «Property 'TextDecoder' doesn't exist».
 *
 * Jest выполняется в Node, где `TextDecoder` есть, поэтому обычные
 * тесты такую ошибку не ловят — она появляется только на устройстве.
 */

/** Глобальный объект без обещания, что `TextDecoder` в нём есть. */
type GlobalWithDecoder = { TextDecoder?: unknown };

/**
 * Ставит `TextDecoder`, если его нет. Идемпотентна.
 *
 * Вызывается из сборки пакета, а не при запуске приложения: таблицы
 * однобайтовых кодировок весят сотни килобайт, и разбирать их на старте
 * ради функции, которой пользуется одна редкая операция, незачем.
 */
export function ensureTextDecoder(): void {
  const scope = globalThis as GlobalWithDecoder;

  if (typeof scope.TextDecoder === 'function') {
    return;
  }

  // require, а не import: модуль должен разбираться при первом вызове,
  // а не при загрузке приложения (см. комментарий выше). Таблицы
  // кодировок подключаются первыми — без них полифилл знает только
  // UTF-8 и UTF-16, а fontkit просит `macintosh` и прочие.
  require('@zxing/text-encoding/cjs/encoding-indexes.js');
  const { TextDecoder } = require('@zxing/text-encoding');

  scope.TextDecoder = TextDecoder;
}
