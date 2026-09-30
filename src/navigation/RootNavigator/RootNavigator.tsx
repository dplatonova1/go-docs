/**
 * Корень навигации: нижняя панель вкладок «Главная», «Библиотека»,
 * «Настройки», у каждой свой стек
 * ([ADR-0014](../../../docs/adr/0014-react-navigation-native-stack.md),
 * [ADR-0022](../../../docs/adr/0022-bottom-tabs.md)).
 *
 * До того как навигация построена, показывается загрузка или отказ
 * хранилища: без миграций читать заявки нельзя, а без заявок неизвестно,
 * с какого экрана начинать.
 *
 * `linking` не настраивается сознательно — внешних ссылок, открывающих
 * приложение с данными, быть не должно (см. [`../README.md`](../README.md)).
 */

import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useMemo } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';
import { useTheme } from 'styled-components/native';

import { Button } from '../../components/Button';
import { ALL_EDGES, Screen } from '../../components/Screen';
import { useTranslation } from '../../i18n';
import { TabBar } from '../TabBar';
import { TEST_IDS } from './constants';
import { toNavigationTheme } from './navigationTheme';
import {
  HomeStackNavigator,
  LibraryStackNavigator,
  SettingsStackNavigator,
} from './stacks';
import { Centered, Message, Title } from './styles';
import { useBootstrap } from './useBootstrap';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Панель вкладок — своя, см. `TabBar`. Функция модуля, а не стрелка в
 * JSX: иначе на каждый рендер навигатор получал бы новый компонент.
 */
function renderTabBar(props: BottomTabBarProps) {
  return <TabBar {...props} />;
}

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
        <Screen scrollable={false} edges={ALL_EDGES} testID={TEST_IDS.loading}>
          <Centered>
            <ActivityIndicator
              size="large"
              color={theme.colors.indicator}
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
          {/* «Назад» с корня любой вкладки ведёт на «Главную», а уже
              оттуда — из приложения. */}
          <Tab.Navigator
            tabBar={renderTabBar}
            backBehavior="firstRoute"
            screenOptions={{ headerShown: false }}
          >
            <Tab.Screen
              name="HomeTab"
              component={HomeStackNavigator}
              options={{ title: t.tabs.home }}
            />
            <Tab.Screen
              name="LibraryTab"
              component={LibraryStackNavigator}
              options={{ title: t.tabs.library }}
            />
            <Tab.Screen
              name="SettingsTab"
              component={SettingsStackNavigator}
              options={{ title: t.tabs.settings }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      );

    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}
