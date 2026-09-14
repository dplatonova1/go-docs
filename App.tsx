/**
 * Корневой компонент приложения.
 *
 * TODO: remove before Phase 1 — сейчас здесь напрямую подключён
 * временный экран ручной проверки `SmokeTestScreen`. В Фазе 1 его место
 * займёт навигация (библиотека выбирается там же, см. src/navigation),
 * а сам экран удаляется вместе с папкой src/features/dev.
 *
 * Навигация не заводилась ради одного временного экрана намеренно:
 * выбор библиотеки — решение Фазы 1, а для «запустить и понажимать»
 * достаточно отрисовать экран корнем.
 */

import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SmokeTestScreen } from './src/features/dev/SmokeTestScreen';
import { AppThemeProvider } from './src/theme/ThemeProvider';

// --- Запасной экран из шаблона React Native ---------------------------
//
// Оставлен закомментированным намеренно: когда SmokeTestScreen уберут,
// приложению нужно будет что-то показывать, пока Фаза 1 не принесёт
// настоящие экраны. Иначе запуск даст пустой экран.
//
// Чтобы вернуть: раскомментировать всё ниже и подставить <AppContent />
// вместо <SmokeTestScreen /> в App. Импорты тоже закомментированы —
// иначе линтер падает на неиспользуемых.
//
// import { NewAppScreen } from '@react-native/new-app-screen';
// import { StyleSheet, View } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
//
// function AppContent() {
//   const safeAreaInsets = useSafeAreaInsets();
//
//   return (
//     <View style={styles.container}>
//       <NewAppScreen
//         templateFileName="App.tsx"
//         safeAreaInsets={safeAreaInsets}
//       />
//     </View>
//   );
// }
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });
//
// ----------------------------------------------------------------------

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <SmokeTestScreen />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
