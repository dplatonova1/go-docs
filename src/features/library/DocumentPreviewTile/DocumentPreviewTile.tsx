/**
 * Содержимое плитки картинки в карточке (`Card`, проп `media`): превью
 * документа, а если его нет — иконка документа (решено 2026-10-05; прежде
 * подпись «Без превью» / «Файл недоступен» мелким текстом, который в
 * плитке 44 точки было не прочитать). Плитку скринридер не видит, так что
 * подпись ничего не сообщала и ему.
 *
 * Превью грузится только пока плитка на экране — см.
 * [`useDocumentPreview`](../useDocumentPreview.ts). Плитку от скринридера
 * скрывает сама карточка: картинка ничего не добавляет к имени файла
 * рядом.
 *
 * Отсутствие файла (`document === null`) хук превью принимает сам — так
 * компонент один, без условного вызова хука.
 */

import { useTheme } from 'styled-components/native';

import { Icon } from '../../../components/Icon';
import { useDocumentPreview } from '../useDocumentPreview';
import { PLACEHOLDER_ICON_SIZE } from './constants';
import { Placeholder, Preview } from './styles';
import type { DocumentPreviewTileProps } from './types';

export function DocumentPreviewTile({
  document,
  testID,
}: DocumentPreviewTileProps) {
  const theme = useTheme();
  const preview = useDocumentPreview(document);

  if (preview.status === 'ready') {
    return (
      <Preview
        source={{ uri: preview.uri }}
        testID={`${testID}-preview`}
        resizeMode="cover"
      />
    );
  }

  return (
    <Placeholder testID={`${testID}-preview-placeholder`}>
      <Icon
        name="document"
        size={PLACEHOLDER_ICON_SIZE}
        color={theme.colors.textSecondary}
      />
    </Placeholder>
  );
}
