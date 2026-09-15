/**
 * Текст подтверждения сброса заявки
 * ([ADR-0012](../../../docs/adr/0012-delete-orphan-documents-with-application.md),
 * раздел «Подтверждение»).
 *
 * Сброс необратим, поэтому диалог называет, что именно пропадёт, числами.
 * Числа — в скобках, а не со склонением («7 пунктов», «1 пункт»): так
 * текст остаётся верным при любом количестве без правил плюрализации.
 */

import type { ResetImpact } from './model';

export type ResetConfirmation = {
  readonly title: string;
  readonly message: string;
};

export function resetConfirmation(
  applicationTitle: string,
  impact: ResetImpact,
): ResetConfirmation {
  const parts = [
    `Будут удалены все пункты чек-листа (${impact.itemCount}), и вы вернётесь к созданию заявки.`,
  ];

  if (impact.deletedDocumentCount > 0) {
    parts.push(
      `Вместе с ними удалятся прикреплённые документы (${impact.deletedDocumentCount}) — в других заявках они не используются.`,
    );
  }

  if (impact.keptDocumentCount > 0) {
    parts.push(
      `Документы, прикреплённые также к другим заявкам (${impact.keptDocumentCount}), останутся.`,
    );
  }

  parts.push('Отменить это нельзя.');

  return {
    title: `Сбросить заявку «${applicationTitle}»?`,
    message: parts.join(' '),
  };
}
