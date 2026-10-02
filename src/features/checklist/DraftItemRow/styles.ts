import styled from 'styled-components/native';

/**
 * Кнопки переносятся на следующую строку, а не сжимаются: при крупном
 * системном шрифте три кнопки в ряд на узком экране не помещаются.
 */
export const Actions = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;
