/**
 * Строка списка заявок: название, переход к чек-листу и переименование.
 * Удаления здесь нет — оно на экране чек-листа заявки.
 *
 * Название — отдельная кнопка во всю ширину, а не вся карточка целиком:
 * иначе кнопки внутри оказались бы вложены в нажимаемую область, и
 * скринридер объявлял бы строку одной кнопкой.
 *
 * Тексты берутся хуком: строка мемоизирована и с прежними пропсами не
 * перерисовалась бы при смене языка (см. [`src/i18n`](../../../i18n)).
 */

import { memo, useCallback } from 'react';

import { useTheme } from 'styled-components/native';

import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Icon } from '../../../components/Icon';
import { useTranslation } from '../../../i18n';
import { CHEVRON_SIZE, TEST_ID_PREFIX } from './constants';
import { Actions, OpenArea, Title, actionStyle, pressedStyle } from './styles';
import type { ApplicationRowProps } from './types';

export const ApplicationRow = memo(function ApplicationRowImpl({
  application,
  index,
  total,
  onOpen,
  onRename,
}: ApplicationRowProps) {
  const t = useTranslation();
  const theme = useTheme();
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

  return (
    <Card
      testID={testID}
      footer={
        <Actions>
          <Button
            variant="secondary"
            label={t.applicationRow.rename}
            // Вслух — какую именно: «Переименовать» в списке из нескольких
            // заявок ничего не говорит.
            accessibilityLabel={t.applicationRow.renameA11y(application.title)}
            testID={`${testID}-rename`}
            style={actionStyle}
            onPress={handleRename}
          />
        </Actions>
      }
    >
      <OpenArea
        accessibilityRole="button"
        accessibilityLabel={t.applicationRow.openA11y(
          number,
          total,
          application.title,
        )}
        testID={`${testID}-open`}
        style={({ pressed }) => (pressed ? pressedStyle : undefined)}
        onPress={handleOpen}
      >
        <Title>{application.title}</Title>
        {/* Декоративная: Icon скрыт от скринридера, а подпись области
            уже говорит «открыть чек-лист». */}
        <Icon
          name="chevronRight"
          size={CHEVRON_SIZE}
          color={theme.colors.textSecondary}
        />
      </OpenArea>
    </Card>
  );
});
