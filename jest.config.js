module.exports = {
  preset: '@react-native/jest-preset',
  // @noble/ciphers и @react-native-documents/picker поставляются как ESM.
  // Metro такое собирает без правок, а Jest по умолчанию не трансформирует
  // node_modules: без этих исключений тест, куда попал такой импорт,
  // падает с невнятным «Unexpected token 'export'» вместо понятной ошибки.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community|-documents)?|@noble)/)',
  ],
};
