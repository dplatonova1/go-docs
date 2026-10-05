import styled from 'styled-components/native';

/** Картинка на всю плитку карточки — скругление даёт плитка. */
export const Preview = styled.Image`
  width: 100%;
  height: 100%;
`;

/** Место иконки-заглушки: по центру плитки. */
export const Placeholder = styled.View`
  justify-content: center;
  align-items: center;
`;
