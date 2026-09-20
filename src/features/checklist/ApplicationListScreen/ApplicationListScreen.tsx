/**
 * Список заявок — корневой экран приложения
 * ([ADR-0015](../../../../docs/adr/0015-multiple-applications-last-opened.md)).
 *
 * Здесь всё, что делают с заявкой целиком: открыть, переименовать,
 * удалить, создать новую. Порядок задаёт репозиторий — недавно открытые
 * сверху.
 *
 * Удаление необратимо, поэтому сначала диалог с числами: сколько пунктов
 * чек-листа пропадёт и сколько документов останется в библиотеке
 * ([ADR-0016](../../../../docs/adr/0016-application-deletion-keeps-documents.md)).
 *
 * Отсюда же открывается библиотека документов: она общая для всех
 * заявок, и заходить в неё через конкретную заявку было бы странно.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import { useTheme } from 'styled-components/native';

import { Button } from '../../../components/Button';
import { Screen } from '../../../components/Screen';
import { ApplicationRow } from '../ApplicationRow';
import { applicationDeletionConfirmation } from '../confirmations';
import { describeError } from '../errorMessages';
import { applicationKeyOf, type Application } from '../model';
import {
  deleteApplication,
  getApplicationDeletionImpact,
  listApplications,
} from '../repository';
import { DELETE_IDLE, EMPTY_HINT, LOADING, TEST_IDS } from './constants';
import { ErrorText, Footer, Hint, listContentStyle } from './styles';
import type {
  ApplicationListScreenProps,
  DeleteState,
  ListState,
} from './types';

export function ApplicationListScreen({
  isFocused = true,
  onOpen,
  onRename,
  onCreate,
  onOpenLibrary,
}: ApplicationListScreenProps) {
  const theme = useTheme();
  const [state, setState] = useState<ListState>(LOADING);
  const [attempt, setAttempt] = useState(0);
  const [deleteState, setDeleteState] = useState<DeleteState>(DELETE_IDLE);
  // Состояние доезжает до следующего рендера, а подтверждение в диалоге
  // можно успеть нажать дважды — ref закрывает это синхронно.
  const deletingRef = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      return undefined;
    }

    // Ответ, пришедший после ухода с экрана или после повторной попытки,
    // не должен перезаписать актуальное состояние.
    let cancelled = false;

    listApplications().then(
      applications => {
        if (!cancelled) {
          setState({ status: 'loaded', applications });
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
  }, [isFocused, attempt]);

  const retry = useCallback(() => {
    setState(LOADING);
    setAttempt(value => value + 1);
  }, []);

  const confirmDelete = useCallback(async (application: Application) => {
    if (deletingRef.current) {
      return;
    }
    deletingRef.current = true;
    setDeleteState({ status: 'working', applicationId: application.id });

    try {
      await deleteApplication(application.id);
      // Заявки уже нет — убираем строку на месте, без перечитывания
      // списка и мигания индикатора.
      setState(current =>
        current.status === 'loaded'
          ? {
              status: 'loaded',
              applications: current.applications.filter(
                candidate => candidate.id !== application.id,
              ),
            }
          : current,
      );
      setDeleteState(DELETE_IDLE);
    } catch (error) {
      setDeleteState({ status: 'failed', message: describeError(error) });
    } finally {
      deletingRef.current = false;
    }
  }, []);

  const handleDelete = useCallback(
    async (application: Application) => {
      if (deletingRef.current) {
        return;
      }

      setDeleteState({ status: 'working', applicationId: application.id });

      try {
        const impact = await getApplicationDeletionImpact(application.id);
        setDeleteState(DELETE_IDLE);

        const { title, message } = applicationDeletionConfirmation(
          application.title,
          impact,
        );

        Alert.alert(title, message, [
          // Первой и с ролью cancel: случайное касание не должно удалять.
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: () => {
              confirmDelete(application);
            },
          },
        ]);
      } catch (error) {
        setDeleteState({ status: 'failed', message: describeError(error) });
      }
    },
    [confirmDelete],
  );

  const total = state.status === 'loaded' ? state.applications.length : 0;
  const isDeleting = deleteState.status === 'working';

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Application>) => (
      <ApplicationRow
        application={item}
        index={index}
        total={total}
        actionsDisabled={isDeleting}
        isDeleting={
          deleteState.status === 'working' &&
          deleteState.applicationId === item.id
        }
        onOpen={onOpen}
        onRename={onRename}
        onDelete={handleDelete}
      />
    ),
    [total, isDeleting, deleteState, onOpen, onRename, handleDelete],
  );

  const footer = (
    <Footer>
      {deleteState.status === 'failed' ? (
        <ErrorText
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={TEST_IDS.deleteError}
        >
          {deleteState.message}
        </ErrorText>
      ) : null}

      <Button
        label="Создать заявку"
        accessibilityLabel="Создать новую заявку"
        testID={TEST_IDS.createButton}
        disabled={isDeleting}
        onPress={onCreate}
      />

      <Button
        variant="secondary"
        label="Библиотека документов"
        accessibilityLabel="Открыть библиотеку загруженных документов"
        testID={TEST_IDS.libraryButton}
        disabled={isDeleting}
        onPress={onOpenLibrary}
      />
    </Footer>
  );

  if (state.status === 'loaded') {
    return (
      <Screen scrollable={false} testID={TEST_IDS.screen}>
        <FlatList
          testID={TEST_IDS.list}
          data={state.applications}
          keyExtractor={applicationKeyOf}
          renderItem={renderItem}
          ListEmptyComponent={<Hint testID={TEST_IDS.empty}>{EMPTY_HINT}</Hint>}
          ListFooterComponent={footer}
          contentContainerStyle={listContentStyle}
        />
      </Screen>
    );
  }

  return (
    <Screen testID={TEST_IDS.screen}>
      {state.status === 'loading' ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          accessibilityLabel="Загрузка списка заявок"
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
            label="Повторить"
            accessibilityLabel="Повторить загрузку списка заявок"
            testID={TEST_IDS.retryButton}
            onPress={retry}
          />
        </>
      )}
    </Screen>
  );
}
