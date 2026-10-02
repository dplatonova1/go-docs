import type { TabConfig, TabName } from './types';

/** Иконка и `testID` каждой вкладки. `testID` — контракт для тестов и e2e. */
export const TABS: Record<TabName, TabConfig> = {
  HomeTab: { icon: 'home', testID: 'tab-home' },
  LibraryTab: { icon: 'library', testID: 'tab-library' },
  SettingsTab: { icon: 'settings', testID: 'tab-settings' },
};

/** Размер иконки вкладки. */
export const TAB_ICON_SIZE = 24;

/**
 * Круг под иконкой неактивной вкладки — с референса: иконка в нём
 * занимает около двух третей.
 */
export const TAB_ICON_BUBBLE_SIZE = 36;

/**
 * Расстояние от верхней границы панели до вкладки. Меньше прежних 16:
 * пилюля и круг сами добавили высоты.
 */
export const TAB_BAR_TOP_PADDING = 8;

/**
 * Расстояние от подписи до низа панели — поверх нижней безопасной зоны
 * (индикатора жестов), а не вместо неё.
 */
export const TAB_BAR_BOTTOM_PADDING = 8;

/**
 * Отступ пилюли от краёв ячейки вкладки: пилюли соседних вкладок не
 * должны слипаться.
 */
export const PILL_INSET = 6;

/**
 * Пружина переезда пилюли: доходит быстро и чуть перелетает цель —
 * отсюда ощущение «перетекания», а не механического сдвига.
 */
export const PILL_SPRING = {
  damping: 18,
  stiffness: 180,
  mass: 0.9,
} as const;

/** Растяжение на ходу: насколько шире и ниже пилюля в середине пути. */
export const PILL_STRETCH_X = 1.15;
export const PILL_SQUASH_Y = 0.9;

/** Растянуться — быстро, вернуть форму — мягче. */
export const PILL_STRETCH_IN_MS = 140;
export const PILL_STRETCH_OUT_MS = 260;
