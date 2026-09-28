/**
 * Тексты подтверждения необратимых действий: удаление заявки,
 * открепление файла от пункта и удаление файла из библиотеки.
 *
 * Все три диалога называют последствие прямо. Модуль остаётся чистым —
 * без доступа к БД и файлам, — чтобы тесты экранов проверяли настоящие
 * формулировки. Сами формулировки живут в словарях
 * ([`src/i18n`](../../i18n)); здесь — из каких частей собирается текст.
 *
 * Числа — в скобках, а не со склонением («пунктов: 7», «пунктов: 1»):
 * так текст остаётся верным при любом количестве без правил
 * плюрализации, одинаково в русском и английском.
 */

import { translations } from '../../i18n';
import type {
  ApplicationDeletionImpact,
  AttachedDocument,
  DocumentUsage,
} from './model';

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
  const t = translations().confirmations;
  const parts = [t.deleteApplicationItems(impact.itemCount)];

  if (impact.documentCount > 0) {
    parts.push(t.deleteApplicationDocuments(impact.documentCount));
  }

  parts.push(t.deleteApplicationIrreversible);

  return {
    title: t.deleteApplicationTitle(applicationTitle),
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
  const t = translations().confirmations;
  const name = document.name ?? t.unnamedDocument;
  const parts = [t.detachLink, t.detachWhereToFind];

  if (isLastFileOfItem) {
    parts.push(t.detachUnchecks(itemLabel));
  }

  return {
    title: t.detachTitle(name),
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
  const t = translations().confirmations;
  const name = documentName ?? t.unnamedDocument;
  const parts = [t.deleteDocumentIrreversible];

  if (usage.itemCount > 0) {
    const where = usage.applications
      .map(application =>
        t.deleteDocumentUsageEntry(
          application.applicationTitle,
          application.itemCount,
        ),
      )
      .join('; ');

    parts.push(
      t.deleteDocumentUsage(usage.itemCount, where),
      t.deleteDocumentConsequence,
    );
  } else {
    parts.push(t.deleteDocumentUnused);
  }

  parts.push(t.deleteDocumentTail);

  return {
    title: t.deleteDocumentTitle(name),
    message: parts.join(' '),
  };
}
