import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { HeaderBackButton } from './HeaderBackButton';

/**
 * `headerLeft` стеков: своя кнопка «назад», пока есть куда возвращаться.
 * Функция модуля, а не стрелка в опциях: иначе на каждый рендер шапка
 * получала бы новый компонент.
 */
export function renderHeaderBack({
  canGoBack,
  tintColor,
}: NativeStackHeaderBackProps) {
  if (!canGoBack || tintColor === undefined) {
    return null;
  }

  return <HeaderBackButton tintColor={tintColor} />;
}
