/**
 * Маршрут настроек: экран ничего не знает о навигации, а из настроек
 * никуда не уходят — уход только назад, кнопкой в шапке.
 */

import { SettingsScreen } from '../../features/settings/SettingsScreen';

export function SettingsRoute() {
  return <SettingsScreen />;
}
