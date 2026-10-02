import { SafeAreaView } from 'react-native-safe-area-context';
import styled, { css, toStyleSheet } from 'styled-components/native';

import { LIST_END_PADDING } from '../../theme/metrics';
import type { ContentStyleProps } from './types';

const paddedCss = css`
  padding: 16px;
  gap: 12px;
`;

/**
 * Экран над нижней панелью вкладок: снизу отступа нет, содержимое
 * доходит до панели вплотную.
 */
const flushBottomCss = css`
  padding: 16px;
  padding-bottom: 0;
  gap: 12px;
`;

/**
 * Прокручиваемый экран над панелью вкладок: в конце прокрутки последний
 * элемент не упирается в панель. Отступ у содержимого, поэтому виден
 * только в самом конце.
 */
const flushBottomScrollCss = css`
  padding: 16px;
  padding-bottom: ${LIST_END_PADDING}px;
  gap: 12px;
`;

export const Root = styled(SafeAreaView)`
  flex: 1;
  /* Фон задаётся явно: фон окна Android в тёмной теме тёмно-серый и не
     совпадает с палитрой, а на iOS окно по умолчанию вообще прозрачное. */
  background-color: ${({ theme }) => theme.colors.background};
`;

export const KeyboardAvoider = styled.KeyboardAvoidingView`
  flex: 1;
`;

// Готовые объекты, а не пересборка на каждый рендер.
const PADDED_CONTENT = toStyleSheet(paddedCss);
const FLUSH_BOTTOM_SCROLL_CONTENT = toStyleSheet(flushBottomScrollCss);

/**
 * Отступы прокручиваемого экрана задаются через `contentContainerStyle`,
 * а не стилем самого ScrollView: иначе они не прокручиваются вместе с
 * содержимым. Шаблон styled-components стилизует только `style`, поэтому
 * отступы переданы через `attrs`.
 */
export const ScrollContainer = styled.ScrollView.attrs<ContentStyleProps>(
  ({ $flushBottom }) => ({
    contentContainerStyle: $flushBottom
      ? FLUSH_BOTTOM_SCROLL_CONTENT
      : PADDED_CONTENT,
  }),
)`
  flex: 1;
`;

export const StaticContent = styled.View<ContentStyleProps>`
  flex: 1;

  ${({ $flushBottom }) => ($flushBottom ? flushBottomCss : paddedCss)}
`;
