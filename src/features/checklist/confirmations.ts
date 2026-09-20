/**
 * Тексты подтверждения необратимых действий: удаление заявки и
 * открепление файла от пункта.
 *
 * Оба диалога называют последствие прямо. Модуль чистый — без доступа к
 * БД и файлам, чтобы тесты экранов проверяли настоящие формулировки.
 *
 * Числа — в скобках, а не со склонением («7 пунктов», «1 пункт»): так
 * текст остаётся верным при любом количестве без правил плюрализации.
 */

import type {
  ApplicationDeletionImpact,
  AttachedDocument,
  DocumentUsage,
} from './model';

/** Показывается вместо имени, если источник его не сообщил. */
const UNNAMED_DOCUMENT = 'без имени';

export type Confirmation = {
  readonly title: string;
  readonly message: string;
};

/**
 * Подтверждение удаления заявки
 * ([ADR-0016](../../../docs/adr/0016-application-deletion-keeps-documents.md)).
 *
 * Главное, что должен понять пользователь: пропадёт чек-лист, а файлы —
 * нет. Документ, прикреплённый к пунктам удаляемой заявки, остаётся в
 * библиотеке и может быть прикреплён к следующей.
 */
export function applicationDeletionConfirmation(
  applicationTitle: string,
  impact: ApplicationDeletionImpact,
): Confirmation {
  const parts = [
    `Будут удалены пункты чек-листа этой заявки (${impact.itemCount}).`,
  ];

  if (impact.documentCount > 0) {
    parts.push(
      `Прикреплённые документы (${impact.documentCount}) останутся в библиотеке — их можно прикрепить к другой заявке.`,
    );
  }

  parts.push('Отменить удаление заявки нельзя.');

  return {
    title: `Удалить заявку «${applicationTitle}»?`,
    message: parts.join(' '),
  };
}

/**
 * Подтверждение открепления файла от пункта.
 *
 * Открепление снимает только связь — сам файл остаётся на устройстве
 * ([ADR-0013](../../../docs/adr/0013-detach-deletes-document-in-phase-1.md),
 * раздел «Обновление»). Но экрана со списком загруженных документов ещё
 * нет, и найти открепленный файл в приложении будет негде. Диалог обязан
 * сказать именно это: обещание «файл никуда не денется» было бы для
 * пользователя неправдой, а «файл удалён» — неправдой по факту.
 */
export function documentDetachConfirmation(
  itemLabel: string,
  document: AttachedDocument,
  isLastFileOfItem: boolean,
): Confirmation {
  const name = document.name ?? UNNAMED_DOCUMENT;
  const parts = [
    'Файл перестанет быть прикреплённым к этому пункту.',
    'Списка загруженных документов в приложении пока нет, поэтому найти его снова будет нельзя — если он понадобится, прикрепите файл заново.',
  ];

  if (isLastFileOfItem) {
    parts.push(`Пункт «${itemLabel}» снова станет неотмеченным.`);
  }

  return {
    title: `Открепить файл «${name}»?`,
    message: parts.join(' '),
  };
}

/**
 * Подтверждение удаления документа из библиотеки.
 *
 * Здесь, в отличие от открепления, файл действительно исчезает с
 * устройства, а каскад снимает его со всех пунктов всех заявок. Поэтому
 * диалог перечисляет заявки поимённо: «пропадёт из чек-листов» без
 * ответа на вопрос «из каких» проверить невозможно, а после
 * подтверждения будет поздно.
 */
export function libraryDocumentDeletionConfirmation(
  documentName: string | null,
  usage: DocumentUsage,
): Confirmation {
  const name = documentName ?? UNNAMED_DOCUMENT;
  const parts = [
    'Файл будет удалён с устройства без возможности восстановления.',
  ];

  if (usage.itemCount > 0) {
    const where = usage.applications
      .map(
        application =>
          `«${application.applicationTitle}» — пунктов: ${application.itemCount}`,
      )
      .join('; ');

    parts.push(
      `Сейчас он прикреплён к пунктам чек-листа (${usage.itemCount}) в заявках: ${where}.`,
      'Из этих чек-листов он пропадёт, а пункты, где других файлов нет, снова станут неотмеченными.',
    );
  } else {
    parts.push('Сейчас он не прикреплён ни к одному пункту чек-листа.');
  }

  parts.push('Отменить это нельзя.');

  return {
    title: `Удалить файл «${name}» из библиотеки?`,
    message: parts.join(' '),
  };
}
