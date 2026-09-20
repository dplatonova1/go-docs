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

it('без заявок — сразу создание заявки поверх пустого списка', () => {
  // Первый запуск: список всё равно пуст, и делать в нём нечего, кроме
  // создания. «Назад» при этом остаётся — ведёт в список (ADR-0015).
  expect(initialNavigationState(null)).toEqual({
    index: 1,
    routes: [{ name: 'ApplicationList' }, { name: 'CreateApplication' }],
  });
});

it('с последней открытой — чек-лист поверх списка', () => {
  const state = initialNavigationState(APPLICATION);

  expect(state).toEqual({
    index: 1,
    routes: [
      { name: 'ApplicationList' },
      { name: 'Checklist', params: { applicationId: 'app-1' } },
    ],
  });
});

it('в параметрах маршрута — только id, без объекта заявки', () => {
  const state = initialNavigationState(APPLICATION);
  const checklist = state.routes?.[1];

  // Состояние навигации переживает выгрузку процесса и должно быть
  // сериализуемым; название к моменту восстановления могло измениться.
  expect(checklist?.params).toEqual({ applicationId: 'app-1' });
});
