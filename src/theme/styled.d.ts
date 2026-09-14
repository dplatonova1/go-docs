/**
 * Тип темы для styled-components.
 *
 * Без этого `props.theme` в стилях типизирован как `any`, и опечатка в
 * имени цвета проходит tsc, а на устройстве даёт `undefined` вместо цвета.
 *
 * Расширяется именно `styled-components/native`, а не `styled-components`,
 * как в документации библиотеки: у native-сборки своя копия деклараций, и
 * расширение основного модуля до неё не доходит.
 */

import type { AppTheme } from './theme';

declare module 'styled-components/native' {
  export interface DefaultTheme extends AppTheme {}
}
