/**
 * Создание заявки (Фаза 1).
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
  BackHandler,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';

import { Button } from '../../../components/Button';
import { Screen } from '../../../components/Screen';
import { TextField } from '../../../components/TextField';
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
  EMPTY_ITEMS_ERROR,
  IDLE,
  NOTHING_PARSED_ERROR,
  NO_ITEMS_ERROR,
  PASTED_TEXT_MIN_LINES,
  SAVING,
  TEST_IDS,
  TITLE_REQUIRED_ERROR,
} from './constants';
import {
  Footer,
  FormError,
  Header,
  Heading,
  Hint,
  SectionTitle,
  listContentStyle,
} from './styles';
import type { CreateApplicationScreenProps, SaveState } from './types';

export function CreateApplicationScreen({
  onCreated,
}: CreateApplicationScreenProps) {
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

  // Экран корневой: «назад» на Android закрывает приложение, и черновик
  // пропадает. Если терять есть что — спрашиваем.
  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        Alert.alert(
          'Выйти без сохранения?',
          'Название и список пунктов не сохранены и пропадут.',
          [
            { text: 'Остаться', style: 'cancel' },
            {
              text: 'Выйти',
              style: 'destructive',
              onPress: () => BackHandler.exitApp(),
            },
          ],
        );
        return true;
      },
    );

    return () => subscription.remove();
  }, [isDirty]);

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
        `Найдено пунктов: ${labels.length}. Проверьте список перед сохранением.`,
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
      'Заменить список?',
      `Текущие пункты (${items.length}) и правки в них будут заменены результатом разбора.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Заменить',
          style: 'destructive',
          onPress: () => applyParsed(labels),
        },
      ],
    );
  }, [pastedText, items.length, applyParsed]);

  const handleChangeLabel = useCallback((key: DraftItemKey, label: string) => {
    dispatch({ type: 'edit', key, label });
  }, []);

  // Перестановка и удаление меняют список без перехода фокуса, и
  // пользователь скринридера иначе не узнает, что действие сработало.
  const handleMove = useCallback(
    (key: DraftItemKey, direction: MoveDirection) => {
      dispatch({ type: 'move', key, direction });
      AccessibilityInfo.announceForAccessibility(
        direction === 'up' ? 'Пункт перемещён выше' : 'Пункт перемещён ниже',
      );
    },
    [],
  );

  const handleRemove = useCallback((key: DraftItemKey) => {
    dispatch({ type: 'remove', key });
    AccessibilityInfo.announceForAccessibility('Пункт удалён');
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
      <Heading accessibilityRole="header">Новая заявка</Heading>

      <TextField
        label="Название заявки"
        accessibilityLabel="Название заявки"
        testID={TEST_IDS.titleInput}
        placeholder="Например, ВНЖ в Сербии"
        value={title}
        onChangeText={setTitle}
        returnKeyType="next"
        error={errors?.titleMissing ? TITLE_REQUIRED_ERROR : undefined}
      />

      <TextField
        label="Список документов"
        accessibilityLabel="Текст списка документов для разбора на пункты"
        testID={TEST_IDS.checklistTextInput}
        placeholder="Вставьте список документов с сайта ведомства"
        value={pastedText}
        onChangeText={handlePastedTextChange}
        multiline
        minLines={PASTED_TEXT_MIN_LINES}
        autoCorrect={false}
        error={nothingParsed ? NOTHING_PARSED_ERROR : undefined}
      />

      <Button
        variant="secondary"
        label="Разобрать на пункты"
        accessibilityLabel="Разобрать вставленный текст на пункты чек-листа"
        testID={TEST_IDS.parseButton}
        disabled={pastedText.trim().length === 0}
        onPress={handleParse}
      />

      <SectionTitle accessibilityRole="header">
        {`Пункты чек-листа (${items.length})`}
      </SectionTitle>

      {items.length === 0 ? (
        <Hint>
          Вставьте текст и нажмите «Разобрать на пункты» или добавьте пункты
          вручную. Перед сохранением список можно поправить.
        </Hint>
      ) : null}
    </Header>
  );

  const footer = (
    <Footer>
      <Button
        variant="secondary"
        label="Добавить пункт"
        accessibilityLabel="Добавить пункт чек-листа вручную"
        testID={TEST_IDS.addItemButton}
        onPress={handleAdd}
      />

      {errors?.titleMissing ? (
        <FormError
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={TEST_IDS.titleError}
        >
          {TITLE_REQUIRED_ERROR}
        </FormError>
      ) : null}

      {errors?.noItems ? (
        <FormError
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={TEST_IDS.noItemsError}
        >
          {NO_ITEMS_ERROR}
        </FormError>
      ) : null}

      {errors !== null && errors.emptyItemKeys.size > 0 ? (
        <FormError
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={TEST_IDS.emptyItemsError}
        >
          {EMPTY_ITEMS_ERROR}
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

      <Button
        label={isSaving ? 'Сохранение…' : 'Сохранить заявку'}
        accessibilityLabel="Сохранить заявку и пункты чек-листа"
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
