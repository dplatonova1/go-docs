import type { ReactNode } from 'react';

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
  testID?: string;
};
