import type { ViewStyle } from 'react-native';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { MIN_TOUCH_TARGET, RADII } from '../../theme/metrics';
import { SHADOWS } from '../../theme/shadows';
import { FONTS, textSize } from '../../theme/typography';
import { DISABLED_OPACITY, PRESSED_OPACITY } from './constants';
import type { ContainerStyleProps } from './types';

/**
 * Рамки у кнопки нет, как у primary-кнопки темы: её границу обозначает
 * заливка, а назначение — надпись, контрастная к заливке не меньше 7:1.
 */
export const Container = styled.Pressable<ContainerStyleProps>`
  min-height: ${MIN_TOUCH_TARGET}px;
  justify-content: center;
  align-items: center;
  padding: 12px 16px;
  border-radius: ${RADII.md}px;
  background-color: ${({ theme }) => theme.colors.primary};
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

export const Label = styled.Text`
  /* Без явного размера текст не масштабируется предсказуемо при
     увеличенном системном шрифте. */
  ${textSize(16)}
  font-family: ${FONTS.semibold};
  text-align: center;
  color: ${({ theme }) => theme.colors.onPrimary};
`;
