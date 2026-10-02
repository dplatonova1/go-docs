/**
 * Создание заявки.
 *
 * Поток: название → вставка текста с сайта → «Разобрать на пункты» →
 * правка получившегося списка → «Сохранить заявку». Эвристика разбора
 * ошибается (заголовки, склеенные строки), поэтому её результат никогда
 * не пишется в базу напрямую: в `checklist_items` уходит только тот
 * список, который пользователь видит и подтвердил нажатием «Сохранить».
 *
 * Весь экран — один `FlatList`: поля ввода в шапке, кнопки сохранения в
 * подвале. Вложенный в `ScrollView` список потерял бы виртуализацию.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Alert,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';

import { Button } from '../../../components/Button';
import { GradientButton } from '../../../components/GradientButton';
import { Screen } from '../../../components/Screen';
import { TextField } from '../../../components/TextField';
import { translations, useTranslation } from '../../../i18n';
import { DraftItemRow } from '../DraftItemRow';
import {
  createDraftItems,
  createDraftKeyFactory,
  draftItemKeyOf,
  draftReducer,
  hasUnsavedInput,
  validateDraft,
  type DraftItem,
  type DraftItemKey,
  type MoveDirection,
} from '../draft';
import { describeError } from '../errorMessages';
import { parseChecklistText } from '../parseChecklistText';
import { createApplication } from '../repository';
import {
  EMPTY_DRAFT,
  IDLE,
  PASTED_TEXT_MIN_LINES,
  SAVING,
  TEST_IDS,
} from './constants';
import {
  Footer,
  FormError,
  Header,
  Hint,
  SectionTitle,
  listContentStyle,
} from './styles';
import type { CreateApplicationScreenProps, SaveState } from './types';

export function CreateApplicationScreen({
  onCreated,
  onDirtyChange,
}: CreateApplicationScreenProps) {
  const t = useTranslation();
  const [title, setTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [items, dispatch] = useReducer(draftReducer, EMPTY_DRAFT);
  const [nextKey] = useState(createDraftKeyFactory);
  const [nothingParsed, setNothingParsed] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(IDLE);
  const [focusKey, setFocusKey] = useState<DraftItemKey | null>(null);

  const listRef = useRef<FlatList<DraftItem>>(null);
  const scrollToEndPending = useRef(false);
  // Состояние `saving` доезжает до следующего рендера, а два нажатия
  // успевают раньше. Ref закрывает двойное сохранение синхронно.
  const savingRef = useRef(false);

  const validation = useMemo(() => validateDraft(title, items), [title, items]);
  // Ошибки показываются только после попытки сохранить: подсвечивать
  // красным пустую форму, которую человек ещё не начал заполнять, — шум.
  const errors = submitAttempted && !validation.ok ? validation.errors : null;
  const isSaving = saveState.status === 'saving';
  const isDirty = hasUnsavedInput(title, pastedText, items);

  // Терять черновик при уходе с экрана нельзя, но диалог показывает
  // маршрут: способов уйти несколько, и все они известны навигации.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handlePastedTextChange = useCallback((value: string) => {
    setPastedText(value);
    setNothingParsed(false);
  }, []);

  const applyParsed = useCallback(
    (labels: readonly string[]) => {
      dispatch({
        type: 'replaceAll',
        items: createDraftItems(labels, nextKey),
      });
      setFocusKey(null);
      AccessibilityInfo.announceForAccessibility(
        translations().createApplication.announceParsed(labels.length),
      );
    },
    [nextKey],
  );

  const handleParse = useCallback(() => {
    const labels = parseChecklistText(pastedText);

    if (labels.length === 0) {
      setNothingParsed(true);
      return;
    }

    if (items.length === 0) {
      applyParsed(labels);
      return;
    }

    // Список уже мог быть поправлен руками — молча затирать правки нельзя.
    Alert.alert(
      t.createApplication.replaceTitle,
      t.createApplication.replaceMessage(items.length),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.createApplication.replaceConfirm,
          style: 'destructive',
          onPress: () => applyParsed(labels),
        },
      ],
    );
  }, [pastedText, items.length, applyParsed, t]);

  const handleChangeLabel = useCallback((key: DraftItemKey, label: string) => {
    dispatch({ type: 'edit', key, label });
  }, []);

  // Перестановка и удаление меняют список без перехода фокуса, и
  // пользователь скринридера иначе не узнает, что действие сработало.
  const handleMove = useCallback(
    (key: DraftItemKey, direction: MoveDirection) => {
      dispatch({ type: 'move', key, direction });
      const announcements = translations().createApplication;
      AccessibilityInfo.announceForAccessibility(
        direction === 'up'
          ? announcements.announceMovedUp
          : announcements.announceMovedDown,
      );
    },
    [],
  );

  const handleRemove = useCallback((key: DraftItemKey) => {
    dispatch({ type: 'remove', key });
    AccessibilityInfo.announceForAccessibility(
      translations().createApplication.announceRemoved,
    );
  }, []);

  const handleAdd = useCallback(() => {
    const key = nextKey();
    dispatch({ type: 'add', key });
    setFocusKey(key);
    scrollToEndPending.current = true;
  }, [nextKey]);

  // Прокрутка к новому пункту — после того, как список его отрисовал и
  // размер содержимого изменился, иначе прокручивать ещё не к чему.
  const handleContentSizeChange = useCallback(() => {
    if (scrollToEndPending.current) {
      scrollToEndPending.current = false;
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitAttempted(true);

    if (!validation.ok) {
      if (validation.errors.titleMissing) {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      return;
    }

    if (savingRef.current) {
      return;
    }

    savingRef.current = true;
    setSaveState(SAVING);

    try {
      const application = await createApplication(validation.value);
      onCreated(application);
    } catch (error) {
      savingRef.current = false;
      setSaveState({ status: 'failed', message: describeError(error) });
    }
  }, [validation, onCreated]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<DraftItem>) => (
      <DraftItemRow
        item={item}
        index={index}
        total={items.length}
        hasError={errors?.emptyItemKeys.has(item.key) ?? false}
        autoFocus={item.key === focusKey}
        onChangeLabel={handleChangeLabel}
        onMove={handleMove}
        onRemove={handleRemove}
      />
    ),
    [
      items.length,
      errors,
      focusKey,
      handleChangeLabel,
      handleMove,
      handleRemove,
    ],
  );

  const header = (
    <Header>
      <TextField
        label={t.createApplication.titleLabel}
        accessibilityLabel={t.createApplication.titleLabel}
        testID={TEST_IDS.titleInput}
        placeholder={t.createApplication.titlePlaceholder}
        value={title}
        onChangeText={setTitle}
        returnKeyType="next"
        error={
          errors?.titleMissing ? t.createApplication.titleRequired : undefined
        }
      />

      <TextField
        label={t.createApplication.textLabel}
        accessibilityLabel={t.createApplication.textA11y}
        testID={TEST_IDS.checklistTextInput}
        placeholder={t.createApplication.textPlaceholder}
        value={pastedText}
        onChangeText={handlePastedTextChange}
        multiline
        minLines={PASTED_TEXT_MIN_LINES}
        autoCorrect={false}
        error={nothingParsed ? t.createApplication.nothingParsed : undefined}
      />

      <Button
        variant="secondary"
        size="large"
        label={t.createApplication.parse}
        accessibilityLabel={t.createApplication.parseA11y}
        testID={TEST_IDS.parseButton}
        disabled={pastedText.trim().length === 0}
        onPress={handleParse}
      />

      <SectionTitle accessibilityRole="header">
        {t.createApplication.sectionTitle(items.length)}
      </SectionTitle>

      {items.length === 0 ? <Hint>{t.createApplication.hint}</Hint> : null}
    </Header>
  );

  const footer = (
    <Footer>
      <Button
        variant="secondary"
        size="large"
        label={t.createApplication.addItem}
        accessibilityLabel={t.createApplication.addItemA11y}
        testID={TEST_IDS.addItemButton}
        onPress={handleAdd}
      />

      {errors?.titleMissing ? (
        <FormError
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={TEST_IDS.titleError}
        >
          {t.createApplication.titleRequired}
        </FormError>
      ) : null}

      {errors?.noItems ? (
        <FormError
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={TEST_IDS.noItemsError}
        >
          {t.createApplication.noItems}
        </FormError>
      ) : null}

      {errors !== null && errors.emptyItemKeys.size > 0 ? (
        <FormError
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={TEST_IDS.emptyItemsError}
        >
          {t.createApplication.emptyItems}
        </FormError>
      ) : null}

      {saveState.status === 'failed' ? (
        <FormError
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={TEST_IDS.saveError}
        >
          {saveState.message}
        </FormError>
      ) : null}

      {/* Как «Собрать пакет»: главное действие экрана (решено
          2026-10-02). */}
      <GradientButton
        accent="sky"
        label={isSaving ? t.common.saving : t.createApplication.save}
        accessibilityLabel={t.createApplication.saveA11y}
        testID={TEST_IDS.saveButton}
        disabled={isSaving}
        onPress={handleSave}
      />
    </Footer>
  );

  return (
    <Screen scrollable={false} testID={TEST_IDS.screen}>
      <FlatList
        ref={listRef}
        testID={TEST_IDS.list}
        data={items}
        keyExtractor={draftItemKeyOf}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={listContentStyle}
        // Иначе первое касание кнопки при открытой клавиатуре только
        // прячет клавиатуру.
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={handleContentSizeChange}
      />
    </Screen>
  );
}
