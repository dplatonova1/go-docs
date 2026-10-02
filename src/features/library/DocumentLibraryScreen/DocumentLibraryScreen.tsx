/**
 * Библиотека документов — все файлы, загруженные в приложение.
 *
 * Один экран в двух режимах. Без `itemId` — просмотр: видно всё, что
 * лежит на устройстве, включая файлы, не прикреплённые ни к одному
 * пункту (после [ADR-0016](../../../../docs/adr/0016-application-deletion-keeps-documents.md)
 * такие появляются при удалении заявки). С `itemId` — выбор файла для
 * пункта чек-листа: прикрепление создаёт только связь, файл не
 * перечитывается и не копируется.
 *
 * Удаление доступно лишь в режиме просмотра: оно стирает файл с
 * устройства и снимает его со всех чек-листов, и такому действию не
 * место рядом с обычным выбором файла.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';

import { Screen } from '../../../components/Screen';
import { GradientSpinner } from '../../../components/GradientSpinner';
import { Button } from '../../../components/Button';
import { translations, useTranslation } from '../../../i18n';
import { libraryDocumentDeletionConfirmation } from '../../checklist/confirmations';
import { describeError } from '../../checklist/errorMessages';
import {
  libraryDocumentKeyOf,
  type LibraryDocument,
} from '../../checklist/model';
import {
  attachLibraryDocumentToItem,
  getDocumentUsage,
  listLibraryDocuments,
} from '../../checklist/repository';
import { DocumentRow } from '../DocumentRow';
import { deleteDocumentFromLibrary } from '../deleteDocumentFromLibrary';
import { ACTION_IDLE, LOADING, TEST_IDS } from './constants';
import { ErrorText, Header, Hint, Summary, listContentStyle } from './styles';
import type {
  ActionState,
  DocumentLibraryScreenProps,
  ListState,
} from './types';

export function DocumentLibraryScreen({
  itemId,
  isFocused = true,
  onAttached,
}: DocumentLibraryScreenProps) {
  const t = useTranslation();
  const mode = itemId === null ? 'browse' : 'pick';
  const [state, setState] = useState<ListState>(LOADING);
  const [attempt, setAttempt] = useState(0);
  const [actionState, setActionState] = useState<ActionState>(ACTION_IDLE);
  // Состояние доезжает до следующего рендера, а второе нажатие может
  // успеть раньше. Ref закрывает это синхронно.
  const workingRef = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      return undefined;
    }

    let cancelled = false;

    listLibraryDocuments(itemId).then(
      documents => {
        if (!cancelled) {
          setState({ status: 'loaded', documents });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: 'failed', message: describeError(error) });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [isFocused, itemId, attempt]);

  const retry = useCallback(() => {
    setState(LOADING);
    setAttempt(value => value + 1);
  }, []);

  const handleAttach = useCallback(
    async (document: LibraryDocument) => {
      if (itemId === null || workingRef.current) {
        return;
      }
      workingRef.current = true;
      setActionState({ status: 'working', documentId: document.id });

      try {
        const result = await attachLibraryDocumentToItem(itemId, document.id);

        if (result === 'already-attached') {
          setActionState({
            status: 'failed',
            message: translations().library.alreadyAttached,
          });
          return;
        }

        AccessibilityInfo.announceForAccessibility(
          translations().library.announceAttached,
        );
        setActionState(ACTION_IDLE);
        onAttached();
      } catch (error) {
        setActionState({ status: 'failed', message: describeError(error) });
      } finally {
        workingRef.current = false;
      }
    },
    [itemId, onAttached],
  );

  const confirmDelete = useCallback(async (document: LibraryDocument) => {
    if (workingRef.current) {
      return;
    }
    workingRef.current = true;
    setActionState({ status: 'working', documentId: document.id });

    try {
      await deleteDocumentFromLibrary(document.id);
      // Документа уже нет — убираем строку на месте, без перечитывания.
      setState(current =>
        current.status === 'loaded'
          ? {
              status: 'loaded',
              documents: current.documents.filter(
                candidate => candidate.id !== document.id,
              ),
            }
          : current,
      );
      AccessibilityInfo.announceForAccessibility(
        translations().library.announceDeleted,
      );
      setActionState(ACTION_IDLE);
    } catch (error) {
      setActionState({ status: 'failed', message: describeError(error) });
    } finally {
      workingRef.current = false;
    }
  }, []);

  const handleDelete = useCallback(
    async (document: LibraryDocument) => {
      if (workingRef.current) {
        return;
      }

      setActionState({ status: 'working', documentId: document.id });

      try {
        // Где документ используется — считается перед каждым удалением:
        // между открытием экрана и нажатием его могли прикрепить ещё
        // куда-то.
        const usage = await getDocumentUsage(document.id);
        setActionState(ACTION_IDLE);

        const { title, message } = libraryDocumentDeletionConfirmation(
          document.name,
          usage,
        );

        Alert.alert(title, message, [
          // Первой и с ролью cancel: случайное касание не должно удалять.
          { text: t.common.cancel, style: 'cancel' },
          {
            text: t.common.delete,
            style: 'destructive',
            onPress: () => {
              confirmDelete(document);
            },
          },
        ]);
      } catch (error) {
        setActionState({ status: 'failed', message: describeError(error) });
      }
    },
    [confirmDelete, t],
  );

  const total = state.status === 'loaded' ? state.documents.length : 0;
  const isBusy = actionState.status === 'working';

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<LibraryDocument>) => (
      <DocumentRow
        document={item}
        index={index}
        total={total}
        mode={mode}
        actionsDisabled={isBusy}
        isBusy={
          actionState.status === 'working' && actionState.documentId === item.id
        }
        onAttach={handleAttach}
        onDelete={handleDelete}
      />
    ),
    [total, mode, isBusy, actionState, handleAttach, handleDelete],
  );

  const header = (
    <Header>
      <Summary>
        {mode === 'pick' ? t.library.pickHint : t.library.browseSummary(total)}
      </Summary>

      {actionState.status === 'failed' ? (
        <ErrorText
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={TEST_IDS.actionError}
        >
          {actionState.message}
        </ErrorText>
      ) : null}
    </Header>
  );

  if (state.status === 'loaded') {
    return (
      <Screen scrollable={false} testID={TEST_IDS.screen}>
        <FlatList
          testID={TEST_IDS.list}
          data={state.documents}
          keyExtractor={libraryDocumentKeyOf}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Hint testID={TEST_IDS.empty}>
              {mode === 'pick' ? t.library.emptyPick : t.library.emptyBrowse}
            </Hint>
          }
          contentContainerStyle={listContentStyle}
          // Превью расшифровывается на лету, поэтому за раз готовится
          // меньше строк, чем по умолчанию.
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
        />
      </Screen>
    );
  }

  return (
    // Пока грузится — без прокрутки: лоадеру нужно растянуться на экран,
    // чтобы встать по центру.
    <Screen scrollable={state.status !== 'loading'} testID={TEST_IDS.screen}>
      {state.status === 'loading' ? (
        <GradientSpinner
          fill
          accessibilityLabel={t.library.loadingA11y}
          testID={TEST_IDS.loading}
        />
      ) : (
        <>
          <ErrorText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID={TEST_IDS.loadError}
          >
            {state.message}
          </ErrorText>
          <Button
            variant="secondary"
            label={t.common.retry}
            accessibilityLabel={t.library.retryA11y}
            testID={TEST_IDS.retryButton}
            onPress={retry}
          />
        </>
      )}
    </Screen>
  );
}
