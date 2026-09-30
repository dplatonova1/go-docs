/**
 * Маршрут настроек — корень вкладки «Настройки». Экран ничего не знает
 * о навигации: из настроек никуда не уходят, только на другую вкладку.
 */

import { SettingsScreen } from '../../features/settings/SettingsScreen';

export function SettingsRoute() {
  return <SettingsScreen />;
}
