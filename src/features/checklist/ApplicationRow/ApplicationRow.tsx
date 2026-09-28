/**
 * Строка списка заявок: название, переход к чек-листу, переименование и
 * удаление.
 *
 * Название — отдельная кнопка во всю ширину, а не вся карточка целиком:
 * иначе кнопки внутри оказались бы вложены в нажимаемую область, и
 * скринридер объявлял бы строку одной кнопкой.
 *
 * Тексты берутся хуком: строка мемоизирована и с прежними пропсами не
 * перерисовалась бы при смене языка (см. [`src/i18n`](../../../i18n)).
 */

import { memo, useCallback } from 'react';

import { Button } from '../../../components/Button';
import { useTranslation } from '../../../i18n';
import { TEST_ID_PREFIX } from './constants';
import { Actions, Card, OpenArea, Title, actionStyle, pressedStyle } from './styles';
import type { ApplicationRowProps } from './types';

export const ApplicationRow = memo(function ApplicationRowImpl({
  application,
  index,
  total,
  actionsDisabled,
  isDeleting,
  onOpen,
  onRename,
  onDelete,
}: ApplicationRowProps) {
  const t = useTranslation();
  const number = index + 1;
  const testID = `${TEST_ID_PREFIX}-${index}`;

  const handleOpen = useCallback(
    () => onOpen(application),
    [application, onOpen],
  );

  const handleRename = useCallback(
    () => onRename(application),
    [application, onRename],
  );

  const handleDelete = useCallback(
    () => onDelete(application),
    [application, onDelete],
  );

  return (
    <Card testID={testID}>
      <OpenArea
        accessibilityRole="button"
        accessibilityLabel={t.applicationRow.openA11y(
          number,
          total,
          application.title,
        )}
        accessibilityState={{ disabled: actionsDisabled }}
        testID={`${testID}-open`}
        disabled={actionsDisabled}
        style={({ pressed }) => (pressed ? pressedStyle : undefined)}
        onPress={handleOpen}
      >
        <Title>{application.title}</Title>
      </OpenArea>

      <Actions>
        <Button
          variant="secondary"
          label={t.applicationRow.rename}
          // Вслух — какую именно: «Переименовать» в списке из нескольких
          // заявок ничего не говорит.
          accessibilityLabel={t.applicationRow.renameA11y(application.title)}
          testID={`${testID}-rename`}
          disabled={actionsDisabled}
          style={actionStyle}
          onPress={handleRename}
        />

        <Button
          variant="danger"
          label={isDeleting ? t.common.deleting : t.common.delete}
          accessibilityLabel={t.applicationRow.deleteA11y(application.title)}
          testID={`${testID}-delete`}
          disabled={actionsDisabled}
          style={actionStyle}
          onPress={handleDelete}
        />
      </Actions>
    </Card>
  );
});
