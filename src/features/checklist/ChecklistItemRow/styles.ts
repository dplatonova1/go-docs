import styled from 'styled-components/native';

import { RADII } from '../../../theme/metrics';
import { FONTS, textSize } from '../../../theme/typography';
import type { StatusStyleProps } from './types';

export const Label = styled.Text`
  ${textSize(16)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.text};
`;

/**
 * Плашка статуса. «Прикреплено» — заливка `primary`, «не прикреплено» —
 * контур `border` без заливки: различие видно не только по цвету, но и по
 * форме, а текст на обоих вариантах держит проверенный контраст
 * (`onPrimary`/`primary`, `textSecondary`/`surface`).
 */
export const StatusBadge = styled.View<StatusStyleProps>`
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: ${RADII.pill}px;
  border-width: 1px;
  border-color: ${({ theme, $attached }) =>
    $attached ? theme.colors.attachedBorder : theme.colors.border};
  background-color: ${({ theme, $attached }) =>
    $attached ? theme.colors.attachedSurface : theme.colors.surface};
`;

export const StatusText = styled.Text<StatusStyleProps>`
  ${textSize(13)}
  font-family: ${FONTS.medium};
  color: ${({ theme, $attached }) =>
    $attached ? theme.colors.text : theme.colors.textSecondary};
`;

/**
 * Имя файла и кнопка удаления в одну строку. При крупном системном шрифте
 * кнопка переносится под имя, а не сжимает его до многоточия.
 */
/** Имя файла сжимается многоточием, кнопка-иконка всегда справа. */
export const FileRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

export const FileName = styled.Text`
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  ${textSize(14)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.text};
`;

/**
 * Сообщение об успешном исходе, о котором стоит сказать. Цвет —
 * второстепенного текста: красный здесь означал бы ошибку, которой нет.
 */
export const NoticeText = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.regular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const ErrorText = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.danger};
`;
