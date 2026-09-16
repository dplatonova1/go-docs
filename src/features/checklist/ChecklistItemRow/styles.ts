import { StyleSheet } from 'react-native';
import styled from 'styled-components/native';

import { RADII } from '../../../theme/metrics';
import { FONTS, textSize } from '../../../theme/typography';
import type { StatusStyleProps } from './types';

export const Container = styled.View`
  gap: 8px;
  padding: 12px;
  border-radius: ${RADII.lg}px;
  border-width: ${StyleSheet.hairlineWidth}px;
  border-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.surface};
`;

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
  border-radius: ${RADII.sm}px;
  border-width: 1px;
  border-color: ${({ theme, $attached }) =>
    $attached ? theme.colors.primary : theme.colors.border};
  background-color: ${({ theme, $attached }) =>
    $attached ? theme.colors.primary : theme.colors.surface};
`;

export const StatusText = styled.Text<StatusStyleProps>`
  ${textSize(13)}
  font-family: ${FONTS.medium};
  color: ${({ theme, $attached }) =>
    $attached ? theme.colors.onPrimary : theme.colors.textSecondary};
`;

/**
 * Имя файла и кнопка удаления в одну строку. При крупном системном шрифте
 * кнопка переносится под имя, а не сжимает его до многоточия.
 */
export const FileRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
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

export const ErrorText = styled.Text`
  ${textSize(14)}
  font-family: ${FONTS.medium};
  color: ${({ theme }) => theme.colors.danger};
`;
