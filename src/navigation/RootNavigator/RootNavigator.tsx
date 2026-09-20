/**
 * Корень навигации: стек из списка заявок, чек-листа и создания заявки
 * ([ADR-0014](../../../docs/adr/0014-react-navigation-native-stack.md)).
 *
 * До того как навигация построена, показывается загрузка или отказ
 * хранилища: без миграций читать заявки нельзя, а без заявок неизвестно,
 * с какого экрана начинать.
 *
 * `linking` не настраивается сознательно — внешних ссылок, открывающих
 * приложение с данными, быть не должно (см. [`../README.md`](../README.md)).
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';
import { useTheme } from 'styled-components/native';

import { Button } from '../../components/Button';
import { ALL_EDGES, Screen } from '../../components/Screen';
import {
  ApplicationListRoute,
  ChecklistRoute,
  CreateApplicationRoute,
  DocumentLibraryRoute,
  PickDocumentFromLibraryRoute,
  RenameApplicationRoute,
} from '../routes';
import { SCREEN_TITLES, TEST_IDS } from './constants';
import { toNavigationTheme } from './navigationTheme';
import { Centered, Message, Title } from './styles';
import { useBootstrap } from './useBootstrap';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  const { state, retry } = useBootstrap();

  const navigationTheme = useMemo(
    () => toNavigationTheme(theme, isDark),
    [theme, isDark],
  );

  switch (state.status) {
    case 'loading':
      return (
        // Экраны до `NavigationContainer`: шапки над ними нет, вырез
        // они обходят сами.
        <Screen
          scrollable={false}
          edges={ALL_EDGES}
          testID={TEST_IDS.loading}
        >
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
        <Screen edges={ALL_EDGES} testID={TEST_IDS.failed}>
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

    case 'ready':
      return (
        <NavigationContainer
          theme={navigationTheme}
          initialState={state.initialState}
        >
          <Stack.Navigator>
            <Stack.Screen
              name="ApplicationList"
              component={ApplicationListRoute}
              options={{ title: SCREEN_TITLES.applicationList }}
            />
            {/* Заголовок — название заявки, его ставит сам маршрут после
                загрузки. */}
            <Stack.Screen name="Checklist" component={ChecklistRoute} />
            <Stack.Screen
              name="CreateApplication"
              component={CreateApplicationRoute}
              options={{ title: SCREEN_TITLES.createApplication }}
            />
            <Stack.Screen
              name="DocumentLibrary"
              component={DocumentLibraryRoute}
              options={{ title: SCREEN_TITLES.documentLibrary }}
            />
            <Stack.Screen
              name="PickDocumentFromLibrary"
              component={PickDocumentFromLibraryRoute}
              options={{ title: SCREEN_TITLES.pickDocument }}
            />
            {/* Модально: переименование — короткий шаг поверх списка, из
                которого возвращаются туда же. */}
            <Stack.Screen
              name="RenameApplication"
              component={RenameApplicationRoute}
              options={{
                title: SCREEN_TITLES.renameApplication,
                presentation: 'modal',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      );

    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}
