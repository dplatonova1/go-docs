import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import { toStackScreenOptions } from './navigationTheme';

/** Опции шапки для стеков вкладок — общие, под текущую тему. */
export function useStackScreenOptions() {
  const theme = useTheme();

  return useMemo(() => toStackScreenOptions(theme), [theme]);
}
