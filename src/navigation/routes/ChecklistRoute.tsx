/**
 * Маршрут чек-листа: по `applicationId` из параметров находит заявку,
 * отмечает её открытой и отдаёт экрану.
 *
 * Заявки может не быть: состояние навигации переживает выгрузку процесса,
 * и восстановленный маршрут способен указывать на заявку, сброшенную до
 * этого. Тогда — понятное сообщение и возврат к списку, а не пустой экран.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useTheme } from 'styled-components/native';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { ChecklistScreen } from '../../features/checklist/ChecklistScreen';
import { describeError } from '../../features/checklist/errorMessages';
import type { Application } from '../../features/checklist/model';
import {
  getApplicationById,
  markApplicationOpened,
} from '../../features/checklist/repository';
import { Centered, Message } from '../RootNavigator/styles';
import type { RootStackParamList } from '../RootNavigator/types';
import { MISSING_APPLICATION_MESSAGE, TEST_IDS } from './constants';

type ApplicationState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | { readonly status: 'missing' }
  | { readonly status: 'ready'; readonly application: Application };

const LOADING: ApplicationState = { status: 'loading' };

type Props = NativeStackScreenProps<RootStackParamList, 'Checklist'>;

export function ChecklistRoute({ route, navigation }: Props) {
  const theme = useTheme();
  const { applicationId } = route.params;
  const [state, setState] = useState<ApplicationState>(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getApplicationById(applicationId).then(
      application => {
        if (cancelled) {
          return;
        }

        if (application === null) {
          setState({ status: 'missing' });
          return;
        }

        setState({ status: 'ready', application });
        navigation.setOptions({ title: application.title });

        // Отметка «открыта» решает, что показать при следующем запуске.
        // Её потеря меняет только порядок в списке, поэтому ошибка не
        // показывается и не мешает работе с чек-листом (ADR-0015).
        markApplicationOpened(applicationId).catch(() => {});
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
  }, [applicationId, navigation, attempt]);

  const retry = useCallback(() => {
    setState(LOADING);
    setAttempt(value => value + 1);
  }, []);

  const goToList = useCallback(() => {
    navigation.popTo('ApplicationList');
  }, [navigation]);

  switch (state.status) {
    case 'loading':
      return (
        <Screen scrollable={false} testID={TEST_IDS.checklistLoading}>
          <Centered>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
              accessibilityLabel="Загрузка заявки"
            />
          </Centered>
        </Screen>
      );

    case 'failed':
      return (
        <Screen testID={TEST_IDS.checklistError}>
          <Message accessibilityRole="alert" accessibilityLiveRegion="polite">
            {state.message}
          </Message>
          <Button
            label="Повторить"
            accessibilityLabel="Повторить загрузку заявки"
            testID={TEST_IDS.checklistRetryButton}
            onPress={retry}
          />
        </Screen>
      );

    case 'missing':
      return (
        <Screen testID={TEST_IDS.checklistMissing}>
          <Message accessibilityRole="alert" accessibilityLiveRegion="polite">
            {MISSING_APPLICATION_MESSAGE}
          </Message>
          <Button
            label="К списку заявок"
            accessibilityLabel="Вернуться к списку заявок"
            testID={TEST_IDS.backToListButton}
            onPress={goToList}
          />
        </Screen>
      );

    case 'ready':
      return (
        <ChecklistScreen application={state.application} onReset={goToList} />
      );

    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}
