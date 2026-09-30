import type {
  InitialState,
  NavigatorScreenParams,
} from '@react-navigation/native';

import type {
  ApplicationId,
  ChecklistItemId,
} from '../../features/checklist/model';

/**
 * Маршруты приложения и их параметры
 * ([ADR-0014](../../../docs/adr/0014-react-navigation-native-stack.md),
 * вкладки — [ADR-0022](../../../docs/adr/0022-bottom-tabs.md)).
 *
 * В параметрах — только идентификаторы, не объекты предметной области:
 * состояние навигации переживает выгрузку процесса, поэтому обязано быть
 * сериализуемым, а заявка к моменту восстановления могла быть
 * переименована или удалена.
 */

/** Стек вкладки «Главная»: всё, что делают с заявками. */
export type HomeStackParamList = {
  ApplicationList: undefined;
  Checklist: { applicationId: ApplicationId };
  CreateApplication: undefined;
  RenameApplication: { applicationId: ApplicationId };
  /**
   * Выбор файла для пункта — в стеке заявки, а не во вкладке
   * библиотеки: это шаг работы с чек-листом, и «назад» ведёт к нему.
   */
  PickDocumentFromLibrary: { itemId: ChecklistItemId };
};

/** Стек вкладки «Библиотека». */
export type LibraryStackParamList = {
  DocumentLibrary: undefined;
};

/** Стек вкладки «Настройки». */
export type SettingsStackParamList = {
  Settings: undefined;
};

/** Вкладки нижней панели; у каждой свой стек. */
export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  LibraryTab: NavigatorScreenParams<LibraryStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

/**
 * Типизирует `useNavigation()` во всех экранах без явного параметра —
 * штатный способ React Navigation.
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}

/**
 * Что показать при запуске.
 *
 * Рабочее состояние одно: навигация со стартовым стеком. Заявок может не
 * быть ни одной — это не отдельное состояние запуска, а пустой список
 * заявок ([ADR-0015](../../../docs/adr/0015-multiple-applications-last-opened.md)).
 */
export type BootstrapState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | { readonly status: 'ready'; readonly initialState: InitialState };
