/**
 * Строка черновика: текст пункта и действия над ним.
 *
 * Перестановка — кнопками «Выше»/«Ниже», а не перетаскиванием:
 * перетаскивание недоступно со скринридером и потянуло бы
 * react-native-gesture-handler, а кнопки работают одинаково для всех.
 *
 * Мемоизирована: при вводе в одно поле остальные строки не
 * перерисовываются — колбэки приходят стабильными, а `item` у
 * неизменённых пунктов сохраняет ссылку (см. `draftReducer`).
 */

import { memo, useCallback } from 'react';

import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { formatChecklistLabel } from '../parseChecklistText';
import { EMPTY_ITEM_ERROR, ITEM_MIN_LINES, TEST_ID_PREFIX } from './constants';
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
        label={`Пункт ${number}`}
        accessibilityLabel={`Текст пункта ${number} из ${total}`}
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
        error={hasError ? EMPTY_ITEM_ERROR : undefined}
      />

      <Actions>
        <Button
          variant="secondary"
          label="Выше"
          accessibilityLabel={`Переместить пункт ${number} выше`}
          testID={`${testID}-move-up`}
          disabled={index === 0}
          onPress={handleMoveUp}
        />
        <Button
          variant="secondary"
          label="Ниже"
          accessibilityLabel={`Переместить пункт ${number} ниже`}
          testID={`${testID}-move-down`}
          disabled={index === total - 1}
          onPress={handleMoveDown}
        />
        <Button
          variant="danger"
          label="Удалить"
          accessibilityLabel={`Удалить пункт ${number}`}
          testID={`${testID}-remove`}
          onPress={handleRemove}
        />
      </Actions>
    </Container>
  );
});
