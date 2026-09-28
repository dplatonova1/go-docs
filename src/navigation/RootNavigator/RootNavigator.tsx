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
import { useTranslation } from '../../i18n';
import {
  ApplicationListRoute,
  ChecklistRoute,
  CreateApplicationRoute,
  DocumentLibraryRoute,
  PickDocumentFromLibraryRoute,
  RenameApplicationRoute,
  SettingsRoute,
} from '../routes';
import { TEST_IDS } from './constants';
import { toNavigationTheme } from './navigationTheme';
import { Centered, Message, Title } from './styles';
import { useBootstrap } from './useBootstrap';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const t = useTranslation();
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
              accessibilityLabel={t.bootstrap.loadingA11y}
            />
          </Centered>
        </Screen>
      );

    case 'failed':
      return (
        <Screen edges={ALL_EDGES} testID={TEST_IDS.failed}>
          <Title accessibilityRole="header">{t.bootstrap.failedTitle}</Title>
          <Message accessibilityRole="alert" accessibilityLiveRegion="polite">
            {state.message}
          </Message>
          <Button
            label={t.common.retry}
            accessibilityLabel={t.bootstrap.retryA11y}
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
              options={{ title: t.navigation.applicationList }}
            />
            {/* Заголовок — название заявки, его ставит сам маршрут после
                загрузки. */}
            <Stack.Screen name="Checklist" component={ChecklistRoute} />
            <Stack.Screen
              name="CreateApplication"
              component={CreateApplicationRoute}
              options={{ title: t.navigation.createApplication }}
            />
            <Stack.Screen
              name="DocumentLibrary"
              component={DocumentLibraryRoute}
              options={{ title: t.navigation.documentLibrary }}
            />
            <Stack.Screen
              name="PickDocumentFromLibrary"
              component={PickDocumentFromLibraryRoute}
              options={{ title: t.navigation.pickDocument }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsRoute}
              options={{ title: t.navigation.settings }}
            />
            {/* Модально: переименование — короткий шаг поверх списка, из
                которого возвращаются туда же. */}
            <Stack.Screen
              name="RenameApplication"
              component={RenameApplicationRoute}
              options={{
                title: t.navigation.renameApplication,
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
