/**
 * Пункт сохранённого чек-листа: текст, статус «прикреплено / не
 * прикреплено», имена прикреплённых файлов и кнопка прикрепления.
 *
 * Элементы озвучиваются по отдельности, а не одной группой: внутри
 * `accessible`-контейнера скринридер не дал бы нажать кнопку.
 */

import { memo, useCallback } from 'react';

import { Button } from '../../../components/Button';
import { isAttached } from '../model';
import { STATUS_TEXT, TEST_ID_PREFIX, UNNAMED_FILE } from './constants';
import {
  Container,
  ErrorText,
  FileName,
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
  attachDisabled,
  attachError,
  onAttach,
}: ChecklistItemRowProps) {
  const number = index + 1;
  const testID = `${TEST_ID_PREFIX}-${index}`;
  const attached = isAttached(item);
  const statusText = attached ? STATUS_TEXT.attached : STATUS_TEXT.notAttached;

  const handleAttach = useCallback(
    () => onAttach(item.id),
    [item.id, onAttach],
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

      {item.documents.map((document, documentIndex) => (
        <FileName
          key={document.id}
          accessibilityLabel={`Прикреплённый файл: ${
            document.name ?? UNNAMED_FILE
          }`}
          testID={`${testID}-file-${documentIndex}`}
          // Середина, а не конец: расширение в конце имени важнее.
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {document.name ?? UNNAMED_FILE}
        </FileName>
      ))}

      {attachError !== null ? (
        <ErrorText
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={`${testID}-attach-error`}
        >
          {attachError}
        </ErrorText>
      ) : null}

      <Button
        variant="secondary"
        label={attachLabel}
        accessibilityLabel={`Прикрепить файл к пункту ${number}: ${item.label}`}
        testID={`${testID}-attach`}
        disabled={attachDisabled}
        onPress={handleAttach}
      />
    </Container>
  );
});
