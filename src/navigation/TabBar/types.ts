import type { IconName } from '../../components/Icon';
import type { RootTabParamList } from '../RootNavigator/types';

export type TabName = keyof RootTabParamList;

/** Что рисует вкладка, кроме подписи: подпись берётся из `title` опций. */
export type TabConfig = {
  readonly icon: IconName;
  readonly testID: string;
};

/** Пропсы оформления вкладки, см. `styles.ts`. */
export type TabStyleProps = {
  $selected: boolean;
};

/** Пропсы оформления панели, см. `styles.ts`. */
export type BarStyleProps = {
  /** Нижняя безопасная зона: панель сама обходит индикатор жестов. */
  $bottomInset: number;
};
