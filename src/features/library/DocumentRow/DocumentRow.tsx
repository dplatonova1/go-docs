/**
 * Строка библиотеки документов: превью, имя, дата добавления и действие.
 *
 * Превью грузится самой строкой и только пока она на экране — см.
 * [`useDocumentPreview`](../useDocumentPreview.ts). Картинка для
 * скринридера скрыта (`accessibilityElementsHidden`): она ничего не
 * добавляет к имени файла рядом, а как отдельный элемент только удлиняет
 * обход списка.
 */

import { memo, useCallback } from 'react';

import { Button } from '../../../components/Button';
import { formatAddedDate } from '../formatAddedDate';
import { useDocumentPreview } from '../useDocumentPreview';
import { PREVIEW_PLACEHOLDER, TEST_ID_PREFIX, UNNAMED_DOCUMENT } from './constants';
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
  const preview = useDocumentPreview(document);
  const number = index + 1;
  const testID = `${TEST_ID_PREFIX}-${index}`;
  const name = document.name ?? UNNAMED_DOCUMENT;
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
              {PREVIEW_PLACEHOLDER[preview.status]}
            </PreviewPlaceholderText>
          </PreviewPlaceholder>
        )}

        <Info>
          <Name
            accessibilityLabel={`Документ ${number} из ${total}: ${name}, добавлен ${added}`}
            testID={`${testID}-name`}
            numberOfLines={2}
            // Середина, а не конец: расширение в конце имени важнее.
            ellipsizeMode="middle"
          >
            {name}
          </Name>
          <Meta testID={`${testID}-added`}>{`Добавлен ${added}`}</Meta>
        </Info>
      </Header>

      <Actions>
        {mode === 'pick' ? (
          <Button
            label={
              document.isAttachedToItem
                ? 'Уже прикреплён'
                : isBusy
                ? 'Прикрепление…'
                : 'Прикрепить к пункту'
            }
            accessibilityLabel={
              document.isAttachedToItem
                ? `Файл ${name} уже прикреплён к этому пункту`
                : `Прикрепить файл ${name} к пункту чек-листа`
            }
            testID={`${testID}-attach`}
            disabled={actionsDisabled || document.isAttachedToItem}
            style={actionStyle}
            onPress={handleAttach}
          />
        ) : (
          <Button
            variant="danger"
            label={isBusy ? 'Удаление…' : 'Удалить из библиотеки'}
            // Вслух — что именно удаляется и откуда: рядом в чек-листе
            // есть похожее по звучанию «Открепить», а последствия разные.
            accessibilityLabel={`Удалить файл ${name} из библиотеки, со всех чек-листов`}
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
