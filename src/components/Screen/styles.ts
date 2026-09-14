import { SafeAreaView } from 'react-native-safe-area-context';
import styled, { css, toStyleSheet } from 'styled-components/native';

const contentCss = css`
  padding: 16px;
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

/**
 * Отступы прокручиваемого экрана задаются через `contentContainerStyle`,
 * а не стилем самого ScrollView: иначе они не прокручиваются вместе с
 * содержимым. Шаблон styled-components стилизует только `style`, поэтому
 * отступы переданы через `attrs`.
 */
export const ScrollContainer = styled.ScrollView.attrs({
  contentContainerStyle: toStyleSheet(contentCss),
})`
  flex: 1;
`;

export const StaticContent = styled.View`
  flex: 1;
  ${contentCss}
`;
