import { StorageError, StorageErrorCode } from '../../../storage/errors';
import { describeError } from '../errorMessages';
import { ApplicationAlreadyExistsError, AttachmentError } from '../errors';

describe('describeError', () => {
  it.each(Object.values(StorageErrorCode))(
    'у кода %s есть непустое сообщение',
    code => {
      const message = describeError(new StorageError(code, 'детали'));
      expect(message.length).toBeGreaterThan(0);
      // Текст для разработчика пользователю не показывается.
      expect(message).not.toContain('детали');
    },
  );

  it.each(['picker-failed', 'copy-failed', 'unsupported'] as const)(
    'у ошибки прикрепления %s своё сообщение',
    code => {
      const message = describeError(new AttachmentError(code));
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toContain(code);
    },
  );

  it('вторая заявка — своё сообщение', () => {
    expect(describeError(new ApplicationAlreadyExistsError())).toContain(
      'Заявка уже создана',
    );
  });

  it('неизвестная ошибка — общее сообщение без внутренностей', () => {
    const message = describeError(new Error('SQLITE_CORRUPT at 0x1f'));
    expect(message).not.toContain('SQLITE');
  });
});
