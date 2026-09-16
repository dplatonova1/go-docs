/**
 * Пункт сохранённого чек-листа: текст, статус «прикреплено / не
 * прикреплено», прикреплённые файлы с кнопкой удаления и кнопка
 * прикрепления.
 *
 * Элементы озвучиваются по отдельности, а не одной группой: внутри
 * `accessible`-контейнера скринридер не дал бы нажать кнопку.
 */

import { memo, useCallback } from 'react';

import { Button } from '../../../components/Button';
import { isAttached, type AttachedDocument } from '../model';
import { STATUS_TEXT, TEST_ID_PREFIX, UNNAMED_FILE } from './constants';
import {
  Container,
  ErrorText,
  FileName,
  FileRow,
  Label,
  StatusBadge,
  StatusText,
} from './styles';
import type { ChecklistItemRowProps } from './types';

export const ChecklistItemRow = memo(function ChecklistItemRowImpl({
  item,
  index,
  total,
  isAttaching,
  deletingDocumentId,
  actionsDisabled,
  actionError,
  onAttach,
  onDeleteFile,
}: ChecklistItemRowProps) {
  const number = index + 1;
  const testID = `${TEST_ID_PREFIX}-${index}`;
  const attached = isAttached(item);
  const statusText = attached ? STATUS_TEXT.attached : STATUS_TEXT.notAttached;

  const handleAttach = useCallback(
    () => onAttach(item.id),
    [item.id, onAttach],
  );

  const handleDelete = useCallback(
    (document: AttachedDocument) => onDeleteFile(item.id, document),
    [item.id, onDeleteFile],
  );

  let attachLabel = attached ? 'Прикрепить ещё файл' : 'Прикрепить файл';
  if (isAttaching) {
    attachLabel = 'Прикрепление…';
  }

  return (
    <Container testID={testID}>
      <Label
        accessibilityLabel={`Пункт ${number} из ${total}: ${item.label}`}
        testID={`${testID}-label`}
      >
        {`${number}. ${item.label}`}
      </Label>

      <StatusBadge
        $attached={attached}
        accessible
        accessibilityLabel={`Пункт ${number}: ${statusText.toLowerCase()}`}
        testID={`${testID}-status`}
      >
        <StatusText $attached={attached}>{statusText}</StatusText>
      </StatusBadge>

      {item.documents.map((document, documentIndex) => {
        const name = document.name ?? UNNAMED_FILE;
        const isDeleting = deletingDocumentId === document.id;

        return (
          <FileRow key={document.id}>
            <FileName
              accessibilityLabel={`Прикреплённый файл: ${name}`}
              testID={`${testID}-file-${documentIndex}`}
              // Середина, а не конец: расширение в конце имени важнее.
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {name}
            </FileName>

            <Button
              variant="danger"
              label={isDeleting ? 'Удаление…' : 'Удалить'}
              // Вслух — что именно удаляется: «Удалить» без имени файла в
              // списке из нескольких файлов ничего не говорит.
              accessibilityLabel={`Удалить файл ${name} из пункта ${number}: ${item.label}`}
              testID={`${testID}-file-${documentIndex}-delete`}
              disabled={actionsDisabled}
              onPress={() => handleDelete(document)}
            />
          </FileRow>
        );
      })}

      {actionError !== null ? (
        <ErrorText
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={`${testID}-error`}
        >
          {actionError}
        </ErrorText>
      ) : null}

      <Button
        variant="secondary"
        label={attachLabel}
        accessibilityLabel={`Прикрепить файл к пункту ${number}: ${item.label}`}
        testID={`${testID}-attach`}
        disabled={actionsDisabled}
        onPress={handleAttach}
      />
    </Container>
  );
});
