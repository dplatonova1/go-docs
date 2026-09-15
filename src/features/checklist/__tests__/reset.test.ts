import { resetConfirmation } from '../reset';

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
