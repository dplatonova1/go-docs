/**
 * Логика запуска: миграции → чтение активной заявки → решение, какой
 * экран показать.
 *
 * Миграции здесь, а не в отдельном «бутстрапе»: до их применения читать
 * `applications` нельзя, а других потребителей старта в Фазе 1 нет.
 */

import { useCallback, useEffect, useState } from 'react';

import { runMigrations } from '../../db/client';
import { describeError } from '../../features/checklist/errorMessages';
import type { Application } from '../../features/checklist/model';
import { getActiveApplication } from '../../features/checklist/repository';
import { LOADING } from './constants';
import type { LaunchState } from './types';

export function useLaunchState() {
  const [state, setState] = useState<LaunchState>(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function launch(): Promise<LaunchState> {
      try {
        await runMigrations();
        const application = await getActiveApplication();
        return application === null
          ? { status: 'needsApplication' }
          : { status: 'ready', application };
      } catch (error) {
        return { status: 'failed', message: describeError(error) };
      }
    }

    launch().then(next => {
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

  // Созданная заявка уже известна — перечитывать её из базы незачем.
  const handleCreated = useCallback((application: Application) => {
    setState({ status: 'ready', application });
  }, []);

  // Заявка удалена, а другой в Фазе 1 быть не может — сразу к созданию.
  const handleReset = useCallback(() => {
    setState({ status: 'needsApplication' });
  }, []);

  return { state, retry, handleCreated, handleReset };
}
