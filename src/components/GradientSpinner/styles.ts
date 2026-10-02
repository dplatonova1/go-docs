import { Animated } from 'react-native';
import styled from 'styled-components/native';

import { SPINNER_SIZE } from './constants';
import type { HolderStyleProps } from './types';

/**
 * Обёртка: лоадер всегда по центру по горизонтали, с `$fill` — ещё и по
 * вертикали, на всё свободное место. Размер у лоадера фиксированный, и
 * без обёртки он прижимался к левому краю — системный растягивался на
 * всю ширину и центрировал себя сам.
 */
export const Holder = styled.View<HolderStyleProps>`
  align-self: ${({ $fill }) => ($fill ? 'stretch' : 'center')};
  flex-grow: ${({ $fill }) => ($fill ? 1 : 0)};
  justify-content: center;
  align-items: center;
`;

/** Вращающийся слой. Поворот приходит анимированным стилем из компонента. */
export const Rotor = styled(Animated.View)`
  width: ${SPINNER_SIZE}px;
  height: ${SPINNER_SIZE}px;
`;
