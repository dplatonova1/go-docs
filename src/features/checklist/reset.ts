/**
 * Тексты подтверждения необратимых действий: сброс заявки и удаление
 * прикреплённого файла.
 *
 * Оба диалога называют последствие прямо. Модуль чистый — без доступа к
 * БД и файлам, чтобы тесты экрана проверяли настоящие формулировки.
 *
 * Сброс заявки
 * ([ADR-0012](../../../docs/adr/0012-delete-orphan-documents-with-application.md),
 * раздел «Подтверждение»).
 *
 * Сброс необратим, поэтому диалог называет, что именно пропадёт, числами.
 * Числа — в скобках, а не со склонением («7 пунктов», «1 пункт»): так
 * текст остаётся верным при любом количестве без правил плюрализации.
 */

import type { AttachedDocument, ResetImpact } from './model';

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

/**
 * Подтверждение удаления прикреплённого файла.
 *
 * Слово «открепить» не используется сознательно: в Фазе 1 библиотеки
 * документов нет, и «открепление» — это полное удаление единственной
 * копии файла. Формулировка должна называть последствие прямо, иначе
 * пользователь решит, что файл где-то останется.
 */
export function documentDeletionConfirmation(
  itemLabel: string,
  document: AttachedDocument,
  isLastFileOfItem: boolean,
): ResetConfirmation {
  const name = document.name ?? 'без имени';
  const parts = [
    'Файл будет удалён без возможности восстановления.',
    'Копии в приложении не остаётся — если он понадобится снова, прикрепите его заново.',
  ];

  if (isLastFileOfItem) {
    parts.push(`Пункт «${itemLabel}» снова станет неотмеченным.`);
  }

  return {
    title: `Удалить файл «${name}»?`,
    message: parts.join(' '),
  };
}
