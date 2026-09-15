/**
 * Корневой экран: решает, что показать при запуске.
 *
 * - заявка уже есть → её чек-лист;
 * - заявки нет → создание заявки;
 * - хранилище недоступно → понятная ошибка и повтор.
 *
 * Библиотеки навигации здесь нет сознательно — см.
 * [`../README.md`](../README.md).
 */

import { ActivityIndicator } from 'react-native';
import { useTheme } from 'styled-components/native';

import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { ChecklistScreen } from '../../features/checklist/ChecklistScreen';
import { CreateApplicationScreen } from '../../features/checklist/CreateApplicationScreen';
import { TEST_IDS } from './constants';
import { Centered, Message, Title } from './styles';
import { useLaunchState } from './useLaunchState';

export function RootNavigator() {
  const theme = useTheme();
  const { state, retry, handleCreated, handleReset } = useLaunchState();

  switch (state.status) {
    case 'loading':
      return (
        <Screen scrollable={false} testID={TEST_IDS.loading}>
          <Centered>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
              accessibilityLabel="Загрузка данных"
            />
          </Centered>
        </Screen>
      );

    case 'failed':
      return (
        <Screen testID={TEST_IDS.failed}>
          <Title accessibilityRole="header">Данные недоступны</Title>
          <Message accessibilityRole="alert" accessibilityLiveRegion="polite">
            {state.message}
          </Message>
          <Button
            label="Повторить"
            accessibilityLabel="Повторить открытие данных"
            testID={TEST_IDS.retryButton}
            onPress={retry}
          />
        </Screen>
      );

    case 'needsApplication':
      return <CreateApplicationScreen onCreated={handleCreated} />;

    case 'ready':
      return (
        <ChecklistScreen
          application={state.application}
          onReset={handleReset}
        />
      );

    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}
