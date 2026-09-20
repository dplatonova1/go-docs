/**
 * Загрузка заявки по идентификатору из параметров маршрута.
 *
 * Маршруты передают между собой только id (ADR-0014), поэтому каждый
 * экран заявки начинается с одного и того же: найти её, показать
 * загрузку, обработать «не нашлась». Заявки может не быть по-настоящему:
 * состояние навигации переживает выгрузку процесса, и восстановленный
 * маршрут способен указывать на заявку, удалённую до этого.
 *
 * Отсюда render-prop: экран получает уже загруженную заявку и ничего не
 * знает ни про навигацию, ни про её параметры.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { ActivityIndicator } from 'react-native';
import { useTheme } from 'styled-components/native';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { describeError } from '../../features/checklist/errorMessages';
import type {
  Application,
  ApplicationId,
} from '../../features/checklist/model';
import { getApplicationById } from '../../features/checklist/repository';
import { Centered, Message } from '../RootNavigator/styles';
import type { RootStackParamList } from '../RootNavigator/types';
import { MISSING_APPLICATION_MESSAGE, TEST_IDS } from './constants';

type ApplicationState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | { readonly status: 'missing' }
  | { readonly status: 'ready'; readonly application: Application };

const LOADING: ApplicationState = { status: 'loading' };

export type ApplicationGateProps = {
  applicationId: ApplicationId;
  /** Заявка найдена. Вызывается один раз на каждую загрузку. */
  onReady?: (application: Application) => void;
  children: (application: Application) => ReactElement;
};

export function ApplicationGate({
  applicationId,
  onReady,
  children,
}: ApplicationGateProps) {
  const theme = useTheme();
  // Типизированный хук: `popTo` есть у стека, а не у навигации вообще.
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [state, setState] = useState<ApplicationState>(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getApplicationById(applicationId).then(
      application => {
        if (cancelled) {
          return;
        }
        setState(
          application === null
            ? { status: 'missing' }
            : { status: 'ready', application },
        );
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
  }, [applicationId, attempt]);

  useEffect(() => {
    if (state.status === 'ready') {
      onReady?.(state.application);
    }
  }, [state, onReady]);

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
        <Screen scrollable={false} testID={TEST_IDS.applicationLoading}>
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
        <Screen testID={TEST_IDS.applicationError}>
          <Message accessibilityRole="alert" accessibilityLiveRegion="polite">
            {state.message}
          </Message>
          <Button
            label="Повторить"
            accessibilityLabel="Повторить загрузку заявки"
            testID={TEST_IDS.applicationRetryButton}
            onPress={retry}
          />
        </Screen>
      );

    case 'missing':
      return (
        <Screen testID={TEST_IDS.applicationMissing}>
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
      return children(state.application);

    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}
