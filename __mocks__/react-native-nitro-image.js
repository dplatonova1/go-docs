/**
 * Мок `react-native-nitro-image` для всех тестов.
 *
 * Нативной части в jest нет, и модуль падает уже при импорте. Импорт
 * тянется в тесты через миниатюры (`features/library/thumbnail.ts`):
 * прикрепление файла и превью.
 *
 * Разбор картинки здесь всегда отказывает — это честнее, чем подделывать
 * JPEG: код миниатюр обязан пережить такой отказ (документ без миниатюры
 * — с заглушкой в плитке). Тесты, которым нужна миниатюра, мокают
 * `makeThumbnail` сами, а пакет — `processImage`.
 */

module.exports = {
  Images: {
    loadFromEncodedImageDataAsync: jest.fn(() =>
      Promise.reject(new Error('react-native-nitro-image недоступен в тестах')),
    ),
  },
};
