import { newId } from '../ids';

jest.mock('react-native-get-random-values', () => ({}));

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  it('выдаёт UUID версии 4', () => {
    for (let i = 0; i < 200; i++) {
      expect(newId()).toMatch(UUID_V4);
    }
  });

  it('биты версии и варианта ставятся при любых случайных байтах', () => {
    // Крайние значения байтов: все нули и все единицы.
    for (const fill of [0x00, 0xff]) {
      const spy = jest
        .spyOn(crypto, 'getRandomValues')
        .mockImplementation(array => {
          (array as unknown as Uint8Array).fill(fill);
          return array;
        });

      expect(newId()).toMatch(UUID_V4);
      spy.mockRestore();
    }
  });

  it('не повторяется', () => {
    const ids = new Set(Array.from({ length: 1000 }, newId));
    expect(ids.size).toBe(1000);
  });
});
