/**
 * Включено ли в системе «Уменьшение движения».
 *
 * Пилюля активной вкладки при переключении переезжает с анимацией; людям
 * с вестибулярными нарушениями движение на экране мешает, и система
 * даёт им это выключить. Тогда пилюля переставляется сразу.
 *
 * Пока ответ системы не пришёл — `false`: первое переключение вряд ли
 * случится раньше, а ответ приходит за миллисекунды.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then(
      value => {
        if (!cancelled) {
          setReduced(value);
        }
      },
      () => undefined,
    );

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return reduced;
}
