/**
 * Переименование заявки.
 *
 * Отдельный экран, а не `Alert.prompt`: тот есть только на iOS, и на
 * Android пришлось бы писать вторую реализацию. Здесь же работают общий
 * `TextField` с подписью и сообщением об ошибке и общий подъём над
 * клавиатурой из `Screen`.
 *
 * Пустое название не сохраняется: `toNonEmptyText` — единственный способ
 * получить `NonEmptyText`, который ждёт репозиторий, поэтому проверка не
 * может потеряться (см. `model.ts`).
 */

import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { Button } from '../../../components/Button';
import { Screen } from '../../../components/Screen';
import { TextField } from '../../../components/TextField';
import { translations, useTranslation } from '../../../i18n';
import { describeError } from '../errorMessages';
import { toNonEmptyText } from '../model';
import { renameApplication } from '../repository';
import { IDLE, SAVING, TEST_IDS } from './constants';
import { Actions, FormError, Hint } from './styles';
import type { RenameApplicationScreenProps, SaveState } from './types';

export function RenameApplicationScreen({
  application,
  onRenamed,
  onCancel,
}: RenameApplicationScreenProps) {
  const t = useTranslation();
  const [title, setTitle] = useState(application.title);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(IDLE);
  // Состояние `saving` доезжает до следующего рендера, а два нажатия
  // успевают раньше — та же защита, что при создании заявки.
  const savingRef = useRef(false);

  const trimmed = toNonEmptyText(title);
  const isSaving = saveState.status === 'saving';
  const showTitleError = submitAttempted && trimmed === null;

  const handleSave = useCallback(async () => {
    setSubmitAttempted(true);

    if (trimmed === null || savingRef.current) {
      return;
    }

    // Название не изменилось — писать в базу нечего.
    if (trimmed === application.title) {
      onRenamed();
      return;
    }

    savingRef.current = true;
    setSaveState(SAVING);

    try {
      await renameApplication(application.id, trimmed);
      AccessibilityInfo.announceForAccessibility(
        translations().renameApplication.announceRenamed,
      );
      onRenamed();
    } catch (error) {
      savingRef.current = false;
      setSaveState({ status: 'failed', message: describeError(error) });
    }
  }, [trimmed, application.id, application.title, onRenamed]);

  return (
    <Screen testID={TEST_IDS.screen}>
      <Hint>{t.renameApplication.hint}</Hint>

      <TextField
        label={t.renameApplication.titleLabel}
        accessibilityLabel={t.renameApplication.titleLabel}
        testID={TEST_IDS.titleInput}
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSave}
        error={
          showTitleError ? t.renameApplication.titleRequired : undefined
        }
      />

      {saveState.status === 'failed' ? (
        <FormError
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={TEST_IDS.saveError}
        >
          {saveState.message}
        </FormError>
      ) : null}

      <Actions>
        <Button
          label={isSaving ? t.common.saving : t.common.save}
          accessibilityLabel={t.renameApplication.saveA11y}
          testID={TEST_IDS.saveButton}
          disabled={isSaving}
          onPress={handleSave}
        />

        <Button
          variant="secondary"
          label={t.common.cancel}
          accessibilityLabel={t.renameApplication.cancelA11y}
          testID={TEST_IDS.cancelButton}
          disabled={isSaving}
          onPress={onCancel}
        />
      </Actions>
    </Screen>
  );
}
