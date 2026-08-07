import type {
  EmailTransport,
  TransactionalEmailMessage,
} from './email.types';
import {
  EmailRecipientNotAllowedError,
  parseAllowedEmailRecipients,
  RecipientAllowlistEmailTransport,
} from './recipient-allowlist-email.transport';

const message: TransactionalEmailMessage = {
  to: 'Steve@Example.com',
  subject: 'Test',
  html: '<p>Test</p>',
  text: 'Test',
  type: 'email_verification',
  recipientReference: 'recipient-ref',
};

describe('RecipientAllowlistEmailTransport', () => {
  it('parses, trims and normalizes a comma-separated allowlist', () => {
    expect(
      parseAllowedEmailRecipients(
        ' steve@example.com, TEST@example.com,steve@example.com ',
      ),
    ).toEqual(new Set(['steve@example.com', 'test@example.com']));
  });

  it('forwards an allowed recipient to the wrapped transport', async () => {
    const send = jest.fn().mockResolvedValue({ messageId: 'email-1' });
    const transport: EmailTransport = { send };
    const guarded = new RecipientAllowlistEmailTransport(transport, [
      'steve@example.com',
    ]);

    await expect(guarded.send(message)).resolves.toEqual({
      messageId: 'email-1',
    });
    expect(send).toHaveBeenCalledWith(message);
  });

  it('rejects a recipient outside the allowlist before calling Resend', async () => {
    const send = jest.fn();
    const guarded = new RecipientAllowlistEmailTransport({ send }, [
      'test@example.com',
    ]);

    await expect(guarded.send(message)).rejects.toBeInstanceOf(
      EmailRecipientNotAllowedError,
    );
    expect(send).not.toHaveBeenCalled();
  });
});
