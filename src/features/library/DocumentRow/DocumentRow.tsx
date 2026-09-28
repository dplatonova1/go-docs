/**
 * Строка библиотеки документов: превью, имя, дата добавления и действие.
 *
 * Превью грузится самой строкой и только пока она на экране — см.
 * [`useDocumentPreview`](../useDocumentPreview.ts). Картинка для
 * скринридера скрыта (`accessibilityElementsHidden`): она ничего не
 * добавляет к имени файла рядом, а как отдельный элемент только удлиняет
 * обход списка.
 *
 * Тексты берутся хуком: строка мемоизирована и с прежними пропсами не
 * перерисовалась бы при смене языка (см. [`src/i18n`](../../../i18n)).
 */

import { memo, useCallback } from 'react';

import { Button } from '../../../components/Button';
import { useTranslation } from '../../../i18n';
import { formatAddedDate } from '../formatAddedDate';
import { useDocumentPreview } from '../useDocumentPreview';
import { TEST_ID_PREFIX } from './constants';
import {
  Actions,
  Card,
  Header,
  Info,
  Meta,
  Name,
  Preview,
  PreviewPlaceholder,
  PreviewPlaceholderText,
  actionStyle,
} from './styles';
import type { DocumentRowProps } from './types';

export const DocumentRow = memo(function DocumentRowImpl({
  document,
  index,
  total,
  mode,
  actionsDisabled,
  isBusy,
  onAttach,
  onDelete,
}: DocumentRowProps) {
  const t = useTranslation();
  const preview = useDocumentPreview(document);
  const number = index + 1;
  const testID = `${TEST_ID_PREFIX}-${index}`;
  const name = document.name ?? t.documentRow.unnamedDocument;
  // Дата пересчитывается вместе с языком: названия месяцев у каждого
  // свои, и хук здесь — то, что доносит до строки смену языка.
  const added = formatAddedDate(document.createdAt);

  const handleAttach = useCallback(
    () => onAttach(document),
    [document, onAttach],
  );

  const handleDelete = useCallback(
    () => onDelete(document),
    [document, onDelete],
  );

  return (
    <Card testID={testID}>
      <Header>
        {preview.status === 'ready' ? (
          <Preview
            source={{ uri: preview.uri }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID={`${testID}-preview`}
            resizeMode="cover"
          />
        ) : (
          <PreviewPlaceholder
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID={`${testID}-preview-placeholder`}
          >
            <PreviewPlaceholderText>
              {t.documentRow.previewPlaceholder[preview.status]}
            </PreviewPlaceholderText>
          </PreviewPlaceholder>
        )}

        <Info>
          <Name
            accessibilityLabel={t.documentRow.nameA11y(
              number,
              total,
              name,
              added,
            )}
            testID={`${testID}-name`}
            numberOfLines={2}
            // Середина, а не конец: расширение в конце имени важнее.
            ellipsizeMode="middle"
          >
            {name}
          </Name>
          <Meta testID={`${testID}-added`}>{t.documentRow.added(added)}</Meta>
        </Info>
      </Header>

      <Actions>
        {mode === 'pick' ? (
          <Button
            label={
              document.isAttachedToItem
                ? t.documentRow.attached
                : isBusy
                ? t.documentRow.attaching
                : t.documentRow.attach
            }
            accessibilityLabel={
              document.isAttachedToItem
                ? t.documentRow.attachedA11y(name)
                : t.documentRow.attachA11y(name)
            }
            testID={`${testID}-attach`}
            disabled={actionsDisabled || document.isAttachedToItem}
            style={actionStyle}
            onPress={handleAttach}
          />
        ) : (
          <Button
            variant="danger"
            label={
              isBusy ? t.common.deleting : t.documentRow.deleteFromLibrary
            }
            // Вслух — что именно удаляется и откуда: рядом в чек-листе
            // есть похожее по звучанию «Открепить», а последствия разные.
            accessibilityLabel={t.documentRow.deleteA11y(name)}
            testID={`${testID}-delete`}
            disabled={actionsDisabled}
            style={actionStyle}
            onPress={handleDelete}
          />
        )}
      </Actions>
    </Card>
  );
});
