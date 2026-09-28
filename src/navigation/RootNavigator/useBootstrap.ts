/**
 * Логика запуска: выбранный язык → миграции → последняя открытая заявка
 * → стартовый стек навигации.
 *
 * Миграции здесь, а не в отдельном «бутстрапе»: до их применения читать
 * `applications` нельзя, а других потребителей старта нет.
 *
 * Язык — первым шагом и до `try`: до него всё, что покажет приложение,
 * включая сообщение о недоступной базе, будет на языке системы, а не на
 * выбранном ([ADR-0021](../../../docs/adr/0021-runtime-localization.md)).
 * Своих ошибок этот шаг не даёт: испорченный файл настроек читается как
 * «выбора нет» (`storage/settings.ts`).
 */

import { useCallback, useEffect, useState } from 'react';

import { runMigrations } from '../../db/client';
import { describeError } from '../../features/checklist/errorMessages';
import { getLastOpenedApplication } from '../../features/checklist/repository';
import { loadStoredLocale } from '../../i18n/persistence';
import { LOADING } from './constants';
import { initialNavigationState } from './initialNavigationState';
import type { BootstrapState } from './types';

export function useBootstrap() {
  const [state, setState] = useState<BootstrapState>(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<BootstrapState> {
      await loadStoredLocale();

      try {
        await runMigrations();
        const application = await getLastOpenedApplication();
        return {
          status: 'ready',
          initialState: initialNavigationState(application),
        };
      } catch (error) {
        return { status: 'failed', message: describeError(error) };
      }
    }

    bootstrap().then(next => {
      if (!cancelled) {
        setState(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState(LOADING);
    setAttempt(value => value + 1);
  }, []);

  return { state, retry };
}
