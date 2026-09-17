/**
 * Список заявок — корневой экран приложения
 * ([ADR-0015](../../../../docs/adr/0015-multiple-applications-last-opened.md)).
 *
 * Порядок задаёт репозиторий: недавно открытые сверху. Заявок может не
 * быть ни одной — тогда экран объясняет, с чего начать, и это не ошибка,
 * а нормальное первое состояние приложения.
 *
 * Удаления заявки здесь нет сознательно: оно остаётся внутри чек-листа,
 * где показано, что именно пропадёт (ADR-0012), и не размножается по
 * двум экранам.
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItemInfo } from 'react-native';
import { useTheme } from 'styled-components/native';

import { Button } from '../../../components/Button';
import { Screen } from '../../../components/Screen';
import { ApplicationRow } from '../ApplicationRow';
import { describeError } from '../errorMessages';
import { applicationKeyOf, type Application } from '../model';
import { listApplications } from '../repository';
import { EMPTY_HINT, LOADING, TEST_IDS } from './constants';
import { ErrorText, Footer, Hint, listContentStyle } from './styles';
import type { ApplicationListScreenProps, ListState } from './types';

export function ApplicationListScreen({
  isFocused = true,
  onOpen,
  onCreate,
}: ApplicationListScreenProps) {
  const theme = useTheme();
  const [state, setState] = useState<ListState>(LOADING);
  const [attempt, setAttempt] = useState(0);

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

  const total = state.status === 'loaded' ? state.applications.length : 0;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Application>) => (
      <ApplicationRow
        application={item}
        index={index}
        total={total}
        onOpen={onOpen}
      />
    ),
    [total, onOpen],
  );

  const createButton = (
    <Button
      label="Создать заявку"
      accessibilityLabel="Создать новую заявку"
      testID={TEST_IDS.createButton}
      onPress={onCreate}
    />
  );

  if (state.status === 'loaded') {
    return (
      <Screen scrollable={false} testID={TEST_IDS.screen}>
        <FlatList
          testID={TEST_IDS.list}
          data={state.applications}
          keyExtractor={applicationKeyOf}
          renderItem={renderItem}
          ListEmptyComponent={
            <Hint testID={TEST_IDS.empty}>{EMPTY_HINT}</Hint>
          }
          ListFooterComponent={<Footer>{createButton}</Footer>}
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
