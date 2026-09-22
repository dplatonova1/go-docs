/**
 * Сводка замечаний детектора качества — для экрана, сразу после сборки.
 *
 * Пометки есть и в реестре внутри готового PDF, но туда нужно заглянуть.
 * Человек, который только что собрал пакет и уже тянется его отправить,
 * должен узнать про размытый снимок здесь и сейчас — переснять дешевле,
 * чем переподавать документы.
 *
 * Модуль чистый: на вход строки реестра, на выход готовый текст.
 *
 * Числа — в скобках, без склонений («снимки (1)»): так текст остаётся
 * верным при любом количестве, как и в остальных сообщениях проекта.
 */

import type { QualityFlag, RegistryRow } from './types';

/** Сколько пунктов перечислять поимённо, прежде чем свернуть в «и ещё». */
const MAX_LISTED = 3;

const QUALITY_TEXT = {
  blurry: 'возможно, размыт',
  dark: 'возможно, тёмный',
} as const satisfies Record<QualityFlag, string>;

/**
 * @returns текст предупреждения или `null`, если претензий нет.
 */
export function qualityWarning(rows: readonly RegistryRow[]): string | null {
  const flagged = rows.filter(row => row.quality !== null);

  if (flagged.length === 0) {
    return null;
  }

  const listed = flagged
    .slice(0, MAX_LISTED)
    .map(row => {
      const quality = row.quality;
      const note = quality === null ? '' : QUALITY_TEXT[quality];
      return `пункт ${row.itemNumber} «${row.itemLabel}» — ${note}`;
    })
    .join('; ');

  const rest = flagged.length - MAX_LISTED;
  const tail = rest > 0 ? ` и ещё (${rest})` : '';

  return (
    `Снимки с замечаниями (${flagged.length}): ${listed}${tail}. ` +
    'Проверьте их перед печатью — возможно, стоит переснять и собрать пакет заново.'
  );
}
