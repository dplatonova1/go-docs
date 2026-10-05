import type { AttachedDocument, DocumentId } from '../model';
import {
  applicationDeletionConfirmation,
  documentDetachConfirmation,
  libraryDocumentDeletionConfirmation,
} from '../confirmations';

/** Прикреплённый документ для тестов: тип, размер и путь здесь не важны. */
function attached(id: string, name: string | null): AttachedDocument {
  return {
    id: id as DocumentId,
    name,
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    filePath: `documents/${id}`,
    qualityFlag: null,
  };
}

describe('applicationDeletionConfirmation', () => {
  it('без документов — только пункты и предупреждение о необратимости', () => {
    const { title, message } = applicationDeletionConfirmation('ВНЖ Сербия', {
      itemCount: 7,
      documentCount: 0,
    });

    expect(title).toBe('Удалить заявку «ВНЖ Сербия»?');
    expect(message).toContain('пункты чек-листа этой заявки (7)');
    expect(message).not.toContain('документ');
    expect(message).toContain('Отменить удаление заявки нельзя.');
  });

  it('говорит, что документы останутся в библиотеке', () => {
    const { message } = applicationDeletionConfirmation('ВНЖ', {
      itemCount: 3,
      documentCount: 2,
    });

    expect(message).toContain('Прикреплённые документы (2) останутся');
    expect(message).toContain('в библиотеке');
  });

  it('не обещает удаления файлов ни при каком количестве', () => {
    // Главное свойство текста по ADR-0016: пропадает чек-лист, а не файлы.
    for (const documentCount of [0, 1, 5]) {
      const { message } = applicationDeletionConfirmation('ВНЖ', {
        itemCount: 3,
        documentCount,
      });

      expect(message.toLowerCase()).not.toContain('удалятся прикреплённые');
      expect(message.toLowerCase()).not.toContain('файлы будут удалены');
    }
  });
});

describe('documentDetachConfirmation', () => {
  const DOCUMENT = attached('d1', 'Паспорт.pdf');

  it('говорит об откреплении, а не об удалении файла', () => {
    const { title, message } = documentDetachConfirmation(
      'Паспорт',
      DOCUMENT,
      true,
    );

    expect(title).toBe('Открепить файл «Паспорт.pdf»?');
    expect(message).toContain('перестанет быть прикреплённым');
    // Файл остаётся на устройстве — обещать удаление нельзя.
    expect(message.toLowerCase()).not.toContain('будет удалён');
    expect(message.toLowerCase()).not.toContain('без возможности');
  });

  it('честно предупреждает, что найти файл снова будет негде', () => {
    // Экрана со списком загруженных документов пока нет: умолчать об
    // этом — значит пообещать библиотеку, которой нет (ADR-0013,
    // раздел «Обновление»).
    const { message } = documentDetachConfirmation('Паспорт', DOCUMENT, false);

    expect(message).toContain('найти его снова будет нельзя');
    expect(message).toContain('прикрепите файл заново');
  });

  it('предупреждает, что пункт снова станет неотмеченным — если файл последний', () => {
    const last = documentDetachConfirmation('Паспорт', DOCUMENT, true);
    expect(last.message).toContain('Пункт «Паспорт» снова станет неотмеченным');

    const notLast = documentDetachConfirmation('Паспорт', DOCUMENT, false);
    expect(notLast.message).not.toContain('неотмеченным');
  });

  it('файл без имени называется явно', () => {
    const { title } = documentDetachConfirmation(
      'Паспорт',
      attached('d2', null),
      false,
    );
    expect(title).toBe('Открепить файл «без имени»?');
  });
});

describe('libraryDocumentDeletionConfirmation', () => {
  const USAGE = {
    itemCount: 3,
    applications: [
      { applicationTitle: 'ВНЖ Сербия', itemCount: 2 },
      { applicationTitle: 'ПМЖ', itemCount: 1 },
    ],
  };

  it('называет заявки и пункты поимённо', () => {
    const { title, message } = libraryDocumentDeletionConfirmation(
      'Паспорт.pdf',
      USAGE,
    );

    expect(title).toBe('Удалить файл «Паспорт.pdf» из библиотеки?');
    expect(message).toContain('пунктам чек-листа (3)');
    expect(message).toContain('«ВНЖ Сербия» — пунктов: 2');
    expect(message).toContain('«ПМЖ» — пунктов: 1');
  });

  it('говорит, что файл исчезнет с устройства, а не только из чек-листов', () => {
    // Это главное отличие от открепления: там файл остаётся.
    const { message } = libraryDocumentDeletionConfirmation('Скан', USAGE);

    expect(message).toContain('удалён с устройства без возможности');
    expect(message).toContain('Отменить это нельзя.');
  });

  it('неиспользуемый документ — отдельная формулировка, без списка заявок', () => {
    const { message } = libraryDocumentDeletionConfirmation('Скан', {
      itemCount: 0,
      applications: [],
    });

    expect(message).toContain('не прикреплён ни к одному пункту');
    expect(message).not.toContain('заявк');
  });

  it('файл без имени называется явно', () => {
    const { title } = libraryDocumentDeletionConfirmation(null, {
      itemCount: 0,
      applications: [],
    });

    expect(title).toBe('Удалить файл «без имени» из библиотеки?');
  });
});
