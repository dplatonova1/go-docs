/**
 * Строка черновика: текст пункта и действия над ним.
 *
 * Перестановка — кнопками «Выше»/«Ниже», а не перетаскиванием:
 * перетаскивание недоступно со скринридером и потянуло бы
 * react-native-gesture-handler, а кнопки работают одинаково для всех.
 *
 * Мемоизирована: при вводе в одно поле остальные строки не
 * перерисовываются — колбэки приходят стабильными, а `item` у
 * неизменённых пунктов сохраняет ссылку (см. `draftReducer`). Поэтому
 * тексты берутся хуком: с прежними пропсами строка не узнала бы о смене
 * языка (см. [`src/i18n`](../../../i18n)).
 */

import { memo, useCallback } from 'react';

import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { useTranslation } from '../../../i18n';
import { formatChecklistLabel } from '../parseChecklistText';
import { ITEM_MIN_LINES, TEST_ID_PREFIX } from './constants';
import { Actions, Container } from './styles';
import type { DraftItemRowProps } from './types';

export const DraftItemRow = memo(function DraftItemRowImpl({
  item,
  index,
  total,
  hasError,
  autoFocus,
  onChangeLabel,
  onMove,
  onRemove,
}: DraftItemRowProps) {
  const t = useTranslation();
  const { key } = item;
  const number = index + 1;
  const testID = `${TEST_ID_PREFIX}-${index}`;

  const handleChange = useCallback(
    (label: string) => onChangeLabel(key, label),
    [key, onChangeLabel],
  );
  // Оформление — при уходе из поля, а не на каждое нажатие: иначе
  // запятая исчезала бы в момент набора «паспорт, копия».
  const handleBlur = useCallback(() => {
    const formatted = formatChecklistLabel(item.label);
    if (formatted !== item.label) {
      onChangeLabel(key, formatted);
    }
  }, [key, item.label, onChangeLabel]);
  const handleMoveUp = useCallback(() => onMove(key, 'up'), [key, onMove]);
  const handleMoveDown = useCallback(() => onMove(key, 'down'), [key, onMove]);
  const handleRemove = useCallback(() => onRemove(key), [key, onRemove]);

  return (
    <Container testID={testID}>
      <TextField
        label={t.draftItem.label(number)}
        accessibilityLabel={t.draftItem.inputA11y(number, total)}
        testID={`${testID}-input`}
        value={item.label}
        onChangeText={handleChange}
        onBlur={handleBlur}
        // Многострочное — чтобы длинное требование было видно целиком,
        // но Enter не вставляет перевод строки: один пункт — одна строка
        // текста, как и при разборе.
        multiline
        submitBehavior="blurAndSubmit"
        minLines={ITEM_MIN_LINES}
        autoFocus={autoFocus}
        error={hasError ? t.draftItem.emptyItem : undefined}
      />

      <Actions>
        <Button
          variant="secondary"
          label={t.draftItem.moveUp}
          accessibilityLabel={t.draftItem.moveUpA11y(number)}
          testID={`${testID}-move-up`}
          disabled={index === 0}
          onPress={handleMoveUp}
        />
        <Button
          variant="secondary"
          label={t.draftItem.moveDown}
          accessibilityLabel={t.draftItem.moveDownA11y(number)}
          testID={`${testID}-move-down`}
          disabled={index === total - 1}
          onPress={handleMoveDown}
        />
        <Button
          variant="danger"
          label={t.common.delete}
          accessibilityLabel={t.draftItem.removeA11y(number)}
          testID={`${testID}-remove`}
          onPress={handleRemove}
        />
      </Actions>
    </Container>
  );
});
