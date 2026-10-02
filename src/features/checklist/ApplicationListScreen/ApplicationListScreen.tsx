/**
 * Список заявок — корневой экран приложения
 * ([ADR-0015](../../../../docs/adr/0015-multiple-applications-last-opened.md)).
 *
 * Здесь заявку открывают, переименовывают и создают новую. Порядок задаёт
 * репозиторий — недавно открытые сверху.
 *
 * Удаления здесь нет (решено 2026-10-02): заявку удаляют с её экрана
 * чек-листа, где видно, что именно пропадёт
 * ([ADR-0016](../../../../docs/adr/0016-application-deletion-keeps-documents.md)).
 */

import { useCallback, useEffect, useState } from 'react';
import { FlatList, type ListRenderItemInfo } from 'react-native';

import { Button } from '../../../components/Button';
import { GradientSpinner } from '../../../components/GradientSpinner';
import { GradientButton } from '../../../components/GradientButton';
import { Screen } from '../../../components/Screen';
import { useTranslation } from '../../../i18n';
import { ApplicationRow } from '../ApplicationRow';
import { describeError } from '../errorMessages';
import { applicationKeyOf, type Application } from '../model';
import { listApplications } from '../repository';
import { LOADING, TEST_IDS } from './constants';
import { CreateButtonSlot, ErrorText, Hint, listContentStyle } from './styles';
import type { ApplicationListScreenProps, ListState } from './types';

export function ApplicationListScreen({
  isFocused = true,
  onOpen,
  onRename,
  onCreate,
}: ApplicationListScreenProps) {
  const t = useTranslation();
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
        onRename={onRename}
      />
    ),
    [total, onOpen, onRename],
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
            <Hint testID={TEST_IDS.empty}>{t.applicationList.emptyHint}</Hint>
          }
          contentContainerStyle={listContentStyle}
        />

        {/* Снизу во всю ширину, вне списка: создание — главное действие
            экрана, и до него не нужно докручивать список. */}
        <CreateButtonSlot>
          <GradientButton
            accent="sunset"
            icon="add"
            label={t.applicationList.create}
            accessibilityLabel={t.applicationList.createA11y}
            testID={TEST_IDS.createButton}
            onPress={onCreate}
          />
        </CreateButtonSlot>
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
          accessibilityLabel={t.applicationList.loadingA11y}
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
            accessibilityLabel={t.applicationList.retryA11y}
            testID={TEST_IDS.retryButton}
            onPress={retry}
          />
        </>
      )}
    </Screen>
  );
}
