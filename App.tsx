/**
 * Корневой компонент приложения.
 *
 * Провайдеры безопасных зон и темы и корневой экран, который решает, что
 * показать при запуске (см. src/navigation/RootNavigator).
 */

import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { AppThemeProvider } from './src/theme/ThemeProvider';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <RootNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
