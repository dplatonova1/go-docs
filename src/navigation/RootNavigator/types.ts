import type { InitialState } from '@react-navigation/native';

import type { ApplicationId } from '../../features/checklist/model';

/**
 * Маршруты приложения и их параметры
 * ([ADR-0014](../../../docs/adr/0014-react-navigation-native-stack.md)).
 *
 * В параметрах — только идентификаторы, не объекты предметной области:
 * состояние навигации переживает выгрузку процесса, поэтому обязано быть
 * сериализуемым, а заявка к моменту восстановления могла быть
 * переименована или удалена.
 */
export type RootStackParamList = {
  ApplicationList: undefined;
  Checklist: { applicationId: ApplicationId };
  CreateApplication: undefined;
};

/**
 * Типизирует `useNavigation()` во всех экранах без явного параметра —
 * штатный способ React Navigation.
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
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
