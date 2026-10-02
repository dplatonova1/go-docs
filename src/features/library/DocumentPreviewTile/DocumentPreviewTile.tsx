/**
 * Содержимое плитки картинки в карточке (`Card`, проп `media`): превью
 * документа, а если его нет — подпись-заглушка, как прежде в библиотеке.
 *
 * Превью грузится только пока плитка на экране — см.
 * [`useDocumentPreview`](../useDocumentPreview.ts). Плитку от скринридера
 * скрывает сама карточка: картинка ничего не добавляет к имени файла
 * рядом.
 *
 * Хук превью нельзя вызвать условно, поэтому документ и его отсутствие —
 * два разных компонента.
 */

import { useTranslation } from '../../../i18n';
import { useDocumentPreview } from '../useDocumentPreview';
import { PlaceholderText, Preview } from './styles';
import type { DocumentPreviewTileProps, LoadedTileProps } from './types';

export function DocumentPreviewTile({
  document,
  testID,
}: DocumentPreviewTileProps) {
  const t = useTranslation();

  if (document === null) {
    return (
      <PlaceholderText
        testID={`${testID}-preview-placeholder`}
        numberOfLines={3}
        adjustsFontSizeToFit
      >
        {t.documentPreview.noFile}
      </PlaceholderText>
    );
  }

  return <LoadedTile document={document} testID={testID} />;
}

function LoadedTile({ document, testID }: LoadedTileProps) {
  const t = useTranslation();
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
    <PlaceholderText
      testID={`${testID}-preview-placeholder`}
      numberOfLines={3}
      adjustsFontSizeToFit
    >
      {t.documentPreview[preview.status]}
    </PlaceholderText>
  );
}
