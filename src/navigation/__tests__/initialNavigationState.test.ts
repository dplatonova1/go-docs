/**
 * Стартовый стек навигации — чистая функция, без нативной части и моков.
 *
 * Проверяется главное свойство ADR-0015: приложение открывается сразу в
 * работе, но список заявок остаётся под чек-листом, поэтому «назад» ведёт
 * к нему, а не закрывает приложение.
 */

import type { ApplicationId } from '../../features/checklist/model';
import { initialNavigationState } from '../RootNavigator/initialNavigationState';

const APPLICATION = {
  id: 'app-1' as ApplicationId,
  title: 'ВНЖ Сербия',
};

/** Стек вкладки «Главная» — вся логика ADR-0015 живёт в нём. */
function homeStack(application: typeof APPLICATION | null) {
  const state = initialNavigationState(application);
  expect(state).toMatchObject({ index: 0, routes: [{ name: 'HomeTab' }] });
  return state.routes[0]?.state;
}

it('запуск открывает вкладку «Главная»; остальные строятся при открытии', () => {
  const state = initialNavigationState(APPLICATION);

  expect(state.index).toBe(0);
  expect(state.routes.map(route => route.name)).toEqual(['HomeTab']);
});

it('без заявок — сразу создание заявки поверх пустого списка', () => {
  // Первый запуск: список всё равно пуст, и делать в нём нечего, кроме
  // создания. «Назад» при этом остаётся — ведёт в список (ADR-0015).
  expect(homeStack(null)).toEqual({
    index: 1,
    routes: [{ name: 'ApplicationList' }, { name: 'CreateApplication' }],
  });
});

it('с последней открытой — чек-лист поверх списка', () => {
  expect(homeStack(APPLICATION)).toEqual({
    index: 1,
    routes: [
      { name: 'ApplicationList' },
      { name: 'Checklist', params: { applicationId: 'app-1' } },
    ],
  });
});

it('в параметрах маршрута — только id, без объекта заявки', () => {
  const checklist = homeStack(APPLICATION)?.routes[1];

  // Состояние навигации переживает выгрузку процесса и должно быть
  // сериализуемым; название к моменту восстановления могло измениться.
  expect(checklist?.params).toEqual({ applicationId: 'app-1' });
});
