import type { ReactNode } from 'react';
import type { Edge } from 'react-native-safe-area-context';

export type ScreenProps = {
  children: ReactNode;
  /**
   * Прокручивать содержимое.
   *
   * По умолчанию включено: при увеличенном системном шрифте не помещается
   * почти любой экран, а этим приложением будут пользоваться в том числе
   * люди, которым крупный шрифт нужен.
   */
  scrollable?: boolean;
  /**
   * Какие безопасные зоны учитывать.
   *
   * По умолчанию — `DEFAULT_EDGES`, то есть все, кроме верхней: её уже
   * учла шапка навигации. Экран вне навигатора (загрузка и отказ
   * хранилища в `RootNavigator`) передаёт `ALL_EDGES`.
   */
  edges?: readonly Edge[];
  testID?: string;
};
