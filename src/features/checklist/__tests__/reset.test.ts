import type { DocumentId } from '../model';
import { documentDeletionConfirmation, resetConfirmation } from '../reset';

describe('resetConfirmation', () => {
  it('без документов — только пункты и предупреждение о необратимости', () => {
    const { title, message } = resetConfirmation('ВНЖ Сербия', {
      itemCount: 7,
      deletedDocumentCount: 0,
      keptDocumentCount: 0,
    });

    expect(title).toBe('Сбросить заявку «ВНЖ Сербия»?');
    expect(message).toContain('пункты чек-листа (7)');
    expect(message).not.toContain('документ');
    expect(message).toContain('Отменить это нельзя.');
  });

  it('называет документы, которые удалятся', () => {
    const { message } = resetConfirmation('ВНЖ', {
      itemCount: 3,
      deletedDocumentCount: 2,
      keptDocumentCount: 0,
    });

    expect(message).toContain('удалятся прикреплённые документы (2)');
    expect(message).not.toContain('останутся');
  });

  it('говорит и о документах, которые останутся', () => {
    const { message } = resetConfirmation('ВНЖ', {
      itemCount: 3,
      deletedDocumentCount: 1,
      keptDocumentCount: 4,
    });

    expect(message).toContain('документы (1)');
    expect(message).toContain('к другим заявкам (4), останутся');
  });
});

describe('documentDeletionConfirmation', () => {
  const DOCUMENT = { id: 'd1' as DocumentId, name: 'Паспорт.pdf' };

  it('говорит об удалении без восстановления, а не об «откреплении»', () => {
    const { title, message } = documentDeletionConfirmation(
      'Паспорт',
      DOCUMENT,
      true,
    );

    expect(title).toBe('Удалить файл «Паспорт.pdf»?');
    expect(message).toContain('удалён без возможности восстановления');
    expect(message.toLowerCase()).not.toContain('открепить');
    expect(message.toLowerCase()).not.toContain('открепление');
  });

  it('предупреждает, что пункт снова станет неотмеченным — если файл последний', () => {
    const last = documentDeletionConfirmation('Паспорт', DOCUMENT, true);
    expect(last.message).toContain('Пункт «Паспорт» снова станет неотмеченным');

    const notLast = documentDeletionConfirmation('Паспорт', DOCUMENT, false);
    expect(notLast.message).not.toContain('неотмеченным');
  });

  it('файл без имени называется явно', () => {
    const { title } = documentDeletionConfirmation(
      'Паспорт',
      { id: 'd2' as DocumentId, name: null },
      false,
    );
    expect(title).toBe('Удалить файл «без имени»?');
  });
});
