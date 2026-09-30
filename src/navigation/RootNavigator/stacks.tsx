/**
 * Стеки вкладок ([ADR-0022](../../../docs/adr/0022-bottom-tabs.md)).
 *
 * У каждой вкладки свой стек: вкладка помнит, где пользователь
 * остановился, — открытый чек-лист не теряется, пока он заглядывает в
 * библиотеку. Шапки у всех стеков одинаковые (`toStackScreenOptions`).
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
import type {
  HomeStackParamList,
  LibraryStackParamList,
  SettingsStackParamList,
} from './types';
import { useStackScreenOptions } from './useStackScreenOptions';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

export function HomeStackNavigator() {
  const t = useTranslation();
  const screenOptions = useStackScreenOptions();

  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen
        name="ApplicationList"
        component={ApplicationListRoute}
        options={{ title: t.navigation.applicationList }}
      />
      {/* Заголовок — название заявки, его ставит сам маршрут после
          загрузки. */}
      <HomeStack.Screen name="Checklist" component={ChecklistRoute} />
      <HomeStack.Screen
        name="CreateApplication"
        component={CreateApplicationRoute}
        options={{ title: t.navigation.createApplication }}
      />
      <HomeStack.Screen
        name="PickDocumentFromLibrary"
        component={PickDocumentFromLibraryRoute}
        options={{ title: t.navigation.pickDocument }}
      />
      {/* Модально: переименование — короткий шаг поверх списка, из
          которого возвращаются туда же. */}
      <HomeStack.Screen
        name="RenameApplication"
        component={RenameApplicationRoute}
        options={{
          title: t.navigation.renameApplication,
          presentation: 'modal',
        }}
      />
    </HomeStack.Navigator>
  );
}

export function LibraryStackNavigator() {
  const t = useTranslation();
  const screenOptions = useStackScreenOptions();

  return (
    <LibraryStack.Navigator screenOptions={screenOptions}>
      <LibraryStack.Screen
        name="DocumentLibrary"
        component={DocumentLibraryRoute}
        options={{ title: t.navigation.documentLibrary }}
      />
    </LibraryStack.Navigator>
  );
}

export function SettingsStackNavigator() {
  const t = useTranslation();
  const screenOptions = useStackScreenOptions();

  return (
    <SettingsStack.Navigator screenOptions={screenOptions}>
      <SettingsStack.Screen
        name="Settings"
        component={SettingsRoute}
        options={{ title: t.navigation.settings }}
      />
    </SettingsStack.Navigator>
  );
}
