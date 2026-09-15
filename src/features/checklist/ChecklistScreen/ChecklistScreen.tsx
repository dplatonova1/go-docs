/**
 * Чек-лист активной заявки.
 *
 * Фаза 1: открывается сразу при запуске, если заявка уже создана.
 * Переключения между заявками нет и не будет до отдельного решения —
 * заявка одна.
 *
 * Под списком — сброс заявки: если список документов при создании
 * составлен неверно, заявку удаляют и создают заново. Сброс необратим,
 * поэтому сначала диалог с тем, что именно пропадёт (ADR-0012).
 *
 * У каждого пункта — прикрепление файла (`attachDocument.ts`). Пикер в
 * системе один, поэтому одновременно прикрепляется только один файл.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import { useTheme } from 'styled-components/native';

import { Button } from '../../../components/Button';
import { Screen } from '../../../components/Screen';
import { ChecklistItemRow } from '../ChecklistItemRow';
import { pickAndAttachDocument } from '../attachDocument';
import { describeError } from '../errorMessages';
import {
  checklistItemKeyOf,
  withAttachedDocument,
  type ChecklistItem,
  type ChecklistItemId,
  type ResetImpact,
} from '../model';
import {
  deleteApplication,
  getResetImpact,
  listChecklistItems,
} from '../repository';
import { resetConfirmation } from '../reset';
import {
  ATTACH_IDLE,
  LOADING,
  RESET_IDLE,
  RESET_WORKING,
  TEST_IDS,
} from './constants';
import {
  ErrorText,
  Footer,
  Header,
  Heading,
  Summary,
  listContentStyle,
} from './styles';
import type {
  AttachState,
  ChecklistScreenProps,
  ItemsState,
  ResetState,
} from './types';

export function ChecklistScreen({
  application,
  onReset,
}: ChecklistScreenProps) {
  const theme = useTheme();
  const [state, setState] = useState<ItemsState>(LOADING);
  const [attempt, setAttempt] = useState(0);
  const [resetState, setResetState] = useState<ResetState>(RESET_IDLE);
  const [attachState, setAttachState] = useState<AttachState>(ATTACH_IDLE);
  // Состояние доезжает до следующего рендера, а второе нажатие может
  // успеть раньше и открыть пикер повторно. Ref закрывает это синхронно.
  const attachingRef = useRef(false);

  useEffect(() => {
    // Ответ, пришедший после размонтирования или после повторной
    // попытки, не должен перезаписать актуальное состояние.
    let cancelled = false;

    listChecklistItems(application.id).then(
      items => {
        if (!cancelled) {
          setState({ status: 'loaded', items });
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
  }, [application.id, attempt]);

  const retry = useCallback(() => {
    setState(LOADING);
    setAttempt(value => value + 1);
  }, []);

  const handleAttach = useCallback(async (itemId: ChecklistItemId) => {
    if (attachingRef.current) {
      return;
    }
    attachingRef.current = true;
    setAttachState({ status: 'working', itemId });

    try {
      const result = await pickAndAttachDocument(itemId);

      if (result.status === 'attached') {
        // Файл уже в базе — список обновляется на месте, без перечитывания
        // и мигания индикатора загрузки.
        setState(current =>
          current.status === 'loaded'
            ? {
                status: 'loaded',
                items: withAttachedDocument(
                  current.items,
                  itemId,
                  result.document,
                ),
              }
            : current,
        );
        AccessibilityInfo.announceForAccessibility('Файл прикреплён');
      }

      setAttachState(ATTACH_IDLE);
    } catch (error) {
      setAttachState({
        status: 'failed',
        itemId,
        message: describeError(error),
      });
    } finally {
      attachingRef.current = false;
    }
  }, []);

  const confirmReset = useCallback(async () => {
    setResetState(RESET_WORKING);
    try {
      await deleteApplication(application.id);
      // Экран размонтируется — состояние после этого не трогаем.
      onReset();
    } catch (error) {
      setResetState({ status: 'failed', message: describeError(error) });
    }
  }, [application.id, onReset]);

  const handleResetPress = useCallback(async () => {
    setResetState(RESET_WORKING);

    let impact: ResetImpact;
    try {
      impact = await getResetImpact(application.id);
    } catch (error) {
      setResetState({ status: 'failed', message: describeError(error) });
      return;
    }

    setResetState(RESET_IDLE);

    const { title, message } = resetConfirmation(application.title, impact);
    Alert.alert(title, message, [
      // Первой и с ролью cancel: случайное касание не должно удалять.
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сбросить',
        style: 'destructive',
        onPress: () => {
          confirmReset();
        },
      },
    ]);
  }, [application.id, application.title, confirmReset]);

  const total = state.status === 'loaded' ? state.items.length : 0;
  const isResetting = resetState.status === 'working';
  const isAttaching = attachState.status === 'working';

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ChecklistItem>) => (
      <ChecklistItemRow
        item={item}
        index={index}
        total={total}
        isAttaching={
          attachState.status === 'working' && attachState.itemId === item.id
        }
        attachDisabled={attachState.status === 'working' || isResetting}
        attachError={
          attachState.status === 'failed' && attachState.itemId === item.id
            ? attachState.message
            : null
        }
        onAttach={handleAttach}
      />
    ),
    [total, attachState, isResetting, handleAttach],
  );

  const header = (
    <Header>
      <Heading accessibilityRole="header">{application.title}</Heading>
      {state.status === 'loaded' ? (
        <Summary>{`Пунктов в чек-листе: ${total}`}</Summary>
      ) : null}
    </Header>
  );

  if (state.status === 'loaded') {
    const footer = (
      <Footer>
        <Summary>
          Список документов составлен неверно? Заявку можно сбросить и создать
          заново.
        </Summary>

        {resetState.status === 'failed' ? (
          <ErrorText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID={TEST_IDS.resetError}
          >
            {resetState.message}
          </ErrorText>
        ) : null}

        <Button
          variant="danger"
          label={isResetting ? 'Сброс…' : 'Сбросить заявку'}
          accessibilityLabel="Сбросить заявку и создать её заново"
          testID={TEST_IDS.resetButton}
          disabled={isResetting || isAttaching}
          onPress={handleResetPress}
        />
      </Footer>
    );

    return (
      <Screen scrollable={false} testID={TEST_IDS.screen}>
        <FlatList
          testID={TEST_IDS.list}
          data={state.items}
          keyExtractor={checklistItemKeyOf}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          contentContainerStyle={listContentStyle}
        />
      </Screen>
    );
  }

  return (
    <Screen testID={TEST_IDS.screen}>
      {header}

      {state.status === 'loading' ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          accessibilityLabel="Загрузка пунктов чек-листа"
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
            accessibilityLabel="Повторить загрузку пунктов чек-листа"
            testID={TEST_IDS.retryButton}
            onPress={retry}
          />
        </>
      )}
    </Screen>
  );
}
