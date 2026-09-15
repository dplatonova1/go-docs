import type { ViewStyle } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { MIN_TOUCH_TARGET, RADII } from '../../theme/metrics';
import { SHADOWS } from '../../theme/shadows';
import { FONTS, textSize } from '../../theme/typography';
import { DISABLED_OPACITY, PRESSED_OPACITY, VARIANT_COLORS } from './constants';
import type { ContainerStyleProps, LabelStyleProps } from './types';

/**
 * У `primary` и `danger` рамки нет: границу обозначает заливка, а
 * назначение — надпись, контрастная к заливке не меньше 7:1. У
 * `secondary` заливка сливается с экраном, и границу рисует рамка.
 */
export const Container = styled.Pressable<ContainerStyleProps>`
  min-height: ${MIN_TOUCH_TARGET}px;
  justify-content: center;
  align-items: center;
  padding: 12px 16px;
  border-radius: ${RADII.md}px;
  background-color: ${({ theme, $variant }) =>
    theme.colors[VARIANT_COLORS[$variant].background]};
  border-width: ${({ $variant }) =>
    VARIANT_COLORS[$variant].border === null ? 0 : 1}px;
  border-color: ${({ theme, $variant }) => {
    const border = VARIANT_COLORS[$variant].border;
    return border === null ? 'transparent' : theme.colors[border];
  }};
  opacity: ${({ $disabled }) => ($disabled ? DISABLED_OPACITY : 1)};
`;

/** Тень кнопки. Объектом, а не в шаблоне — см. `theme/shadows.ts`. */
export const containerShadow = SHADOWS.xs;

/**
 * Нажатое состояние.
 *
 * Не интерполяция в `Container`: Pressable сообщает о нажатии только
 * аргументом функции в `style`, а не пропсом. Поэтому это готовый объект
 * стиля, который компонент возвращает из этой функции.
 */
export const pressedStyle: ViewStyle = toStyleSheet(css`
  opacity: ${PRESSED_OPACITY};
`);

export const Label = styled.Text<LabelStyleProps>`
  /* Без явного размера текст не масштабируется предсказуемо при
     увеличенном системном шрифте. */
  ${textSize(16)}
  font-family: ${FONTS.semibold};
  text-align: center;
  color: ${({ theme, $variant }) =>
    theme.colors[VARIANT_COLORS[$variant].label]};
`;
