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
 * Вкладка «Главная», в её стеке — список заявок, а поверх него последняя
 * открытая заявка или, если заявок нет вообще, экран создания
 * ([ADR-0015](../../../docs/adr/0015-multiple-applications-last-opened.md)).
 * Остальные вкладки строятся при первом открытии.
 *
 * Приложение открывается сразу в работе, но «назад» ведёт в список, а не
 * закрывает приложение. Пустой список — не тупик: с него всё равно
 * начинают с создания заявки, поэтому первый запуск ведёт туда сразу.
 */
export function initialNavigationState(
  application: Application | null,
): InitialState {
  return {
    index: 0,
    routes: [{ name: 'HomeTab', state: homeStackState(application) }],
  };
}

function homeStackState(application: Application | null): InitialState {
  if (application === null) {
    return {
      index: 1,
      routes: [{ name: 'ApplicationList' }, { name: 'CreateApplication' }],
    };
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
