module.exports = {
  preset: '@react-native/jest-preset',
  // @noble/ciphers поставляется как ESM. Metro такое собирает без правок,
  // а Jest по умолчанию не трансформирует node_modules — добавляем
  // библиотеку в исключения, иначе тесты шифрования не запускаются.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@noble)/)',
  ],
};
