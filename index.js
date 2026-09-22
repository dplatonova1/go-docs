/**
 * @format
 */

// Первой строкой и до `App`: импорты выполняются по порядку, а
// `@cantoo/fontkit` требует TextDecoder уже при загрузке своего модуля.
import './src/polyfills/install';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
