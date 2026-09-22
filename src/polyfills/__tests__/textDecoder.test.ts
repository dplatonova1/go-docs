/**
 * Полифилл `TextDecoder`.
 *
 * Тест искусственно убирает `TextDecoder` из глобального объекта: в Node
 * он есть всегда, а на Hermes его нет — и именно из-за этого сборка
 * пакета падала на устройстве с «Property 'TextDecoder' doesn't exist»,
 * оставаясь зелёной в тестах.
 */

import { ensureTextDecoder } from '../textDecoder';

type GlobalWithDecoder = { TextDecoder?: unknown };

const scope = globalThis as GlobalWithDecoder;
const original = scope.TextDecoder;

afterEach(() => {
  scope.TextDecoder = original;
});

it('ставит TextDecoder, когда его нет', () => {
  delete scope.TextDecoder;

  ensureTextDecoder();

  expect(typeof scope.TextDecoder).toBe('function');
});

it('умеет кодировки, которые просит fontkit, а не только UTF-8', () => {
  delete scope.TextDecoder;
  ensureTextDecoder();

  const Decoder = scope.TextDecoder as new (encoding?: string) => {
    decode: (bytes: Uint8Array) => string;
  };

  // Таблицы однобайтовых кодировок обязаны быть загружены: без них
  // конструктор бросает «Decoder not present».
  for (const encoding of ['utf-8', 'latin1', 'ascii', 'macintosh', 'utf-16be']) {
    expect(() => new Decoder(encoding).decode(new Uint8Array([65]))).not.toThrow();
  }
});

it('готовый TextDecoder не подменяется', () => {
  const marker = function FakeDecoder() {};
  scope.TextDecoder = marker;

  ensureTextDecoder();

  expect(scope.TextDecoder).toBe(marker);
});

it('повторный вызов ничего не ломает', () => {
  delete scope.TextDecoder;

  ensureTextDecoder();
  const installed = scope.TextDecoder;
  ensureTextDecoder();

  expect(scope.TextDecoder).toBe(installed);
});
