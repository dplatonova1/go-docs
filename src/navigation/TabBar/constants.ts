import type { TabConfig, TabName } from './types';

/** Иконка и `testID` каждой вкладки. `testID` — контракт для тестов и e2e. */
export const TABS: Record<TabName, TabConfig> = {
  HomeTab: { icon: 'home', testID: 'tab-home' },
  LibraryTab: { icon: 'library', testID: 'tab-library' },
  SettingsTab: { icon: 'settings', testID: 'tab-settings' },
};

/** Размер иконки вкладки. */
export const TAB_ICON_SIZE = 24;

/** Расстояние от верхней границы панели до иконки. */
export const TAB_BAR_TOP_PADDING = 16;

/**
 * Расстояние от подписи до низа панели — поверх нижней безопасной зоны
 * (индикатора жестов), а не вместо неё.
 */
export const TAB_BAR_BOTTOM_PADDING = 8;
