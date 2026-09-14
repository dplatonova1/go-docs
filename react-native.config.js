/**
 * Ассеты, которые встраиваются в нативные проекты.
 *
 * Шрифты подключаются командой `npx react-native-asset`: она копирует
 * файлы в android/app/src/main/assets/fonts и прописывает их в Xcode-проект
 * и Info.plist (UIAppFonts). Запускать заново после добавления или
 * удаления файла в assets/fonts.
 */
module.exports = {
  assets: ['./assets/fonts'],
};
