/**
 * Стартовый стек навигации.
 *
 * Вынесено из `useBootstrap.ts` по той же причине, по которой
 * `selectPendingMigrations` вынесен из `db/client.ts`: чистую функцию
 * можно проверить тестами, не поднимая нативную часть.
 */

import type { InitialState } from '@react-navigation/native';

import type { Application } from '../../features/checklist/model';

/**
 * Список заявок, а поверх него — последняя открытая, если она есть
 * ([ADR-0015](../../../docs/adr/0015-multiple-applications-last-opened.md)).
 *
 * Приложение открывается сразу в работе, но «назад» с чек-листа ведёт в
 * список, а не закрывает приложение.
 */
export function initialNavigationState(
  application: Application | null,
): InitialState {
  if (application === null) {
    return { index: 0, routes: [{ name: 'ApplicationList' }] };
  }

  return {
    index: 1,
    routes: [
      { name: 'ApplicationList' },
      {
        name: 'Checklist',
        params: { applicationId: application.id },
      },
    ],
  };
}
