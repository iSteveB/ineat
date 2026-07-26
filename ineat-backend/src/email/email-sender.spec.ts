import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from './email-sender';
import { EmailTransport, TransactionalEmailMessage } from './email.types';

describe('sendPasswordResetEmail', () => {
  it('renders HTML and text and delegates to the injected transport', async () => {
    const send = jest.fn().mockResolvedValue({ messageId: 'email-123' });
    const transport: EmailTransport = { send };

    await expect(
      sendPasswordResetEmail(
        {
          to: 'person@example.com',
          name: 'Ada',
          resetUrl: 'https://ineat.store/reset-password?token=secret',
        },
        transport,
      ),
    ).resolves.toEqual({ messageId: 'email-123' });

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0] as TransactionalEmailMessage;
    expect(message).toMatchObject({
      to: 'person@example.com',
      subject: 'Réinitialisez votre mot de passe InEat',
      type: 'password_reset',
    });
    expect(message.html).toContain('Choisir un nouveau mot de passe');
    expect(message.text).toContain(
      'https://ineat.store/reset-password?token=secret',
    );
    expect(message.idempotencyKey).toMatch(/^password-reset\/[a-f0-9]{32}$/);
  });

  it('escapes user-controlled values in HTML', async () => {
    let captured: TransactionalEmailMessage | undefined;
    const transport: EmailTransport = {
      send: jest.fn(async (message) => {
        captured = message;
        return { messageId: 'email-123' };
      }),
    };

    await sendPasswordResetEmail(
      {
        to: 'person@example.com',
        name: '<script>alert(1)</script>',
        resetUrl: 'https://ineat.store/reset?x="bad"&y=1',
      },
      transport,
    );

    expect(captured?.html).not.toContain('<script>');
    expect(captured?.html).toContain('&lt;script&gt;');
    expect(captured?.html).toContain('&quot;bad&quot;&amp;y=1');
  });

  it('propagates provider errors', async () => {
    const transport: EmailTransport = {
      send: jest.fn().mockRejectedValue(new Error('provider unavailable')),
    };

    await expect(
      sendPasswordResetEmail(
        {
          to: 'person@example.com',
          resetUrl: 'https://ineat.store/reset-password?token=secret',
        },
        transport,
      ),
    ).rejects.toThrow('provider unavailable');
  });

  it('renders a verification email with a token-derived idempotency key', async () => {
    const send = jest.fn().mockResolvedValue({ messageId: 'email-verify-123' });
    const transport: EmailTransport = { send };

    await expect(
      sendEmailVerificationEmail(
        {
          to: 'person@example.com',
          name: 'Ada',
          verificationUrl:
            'https://api.ineat.store/auth/verify-email?token=secret',
        },
        transport,
      ),
    ).resolves.toEqual({ messageId: 'email-verify-123' });

    const message = send.mock.calls[0][0] as TransactionalEmailMessage;
    expect(message).toMatchObject({
      to: 'person@example.com',
      subject: 'Confirmez votre adresse email InEat',
      type: 'email_verification',
    });
    expect(message.html).toContain('Confirmer mon adresse');
    expect(message.text).toContain('Ce lien expire dans 60 minutes');
    expect(message.idempotencyKey).toMatch(
      /^email-verification\/[a-f0-9]{32}$/,
    );
  });

  it('renders the welcome email with a stable user idempotency key', async () => {
    const send = jest.fn().mockResolvedValue({ messageId: 'welcome-123' });
    const transport: EmailTransport = { send };

    await expect(
      sendWelcomeEmail(
        {
          to: 'steve@example.com',
          firstName: 'Steve',
          appUrl: 'https://ineat.store/app',
          userId: 'user-123',
        },
        transport,
      ),
    ).resolves.toEqual({ messageId: 'welcome-123' });

    const message = send.mock.calls[0][0] as TransactionalEmailMessage;
    expect(message).toMatchObject({
      to: 'steve@example.com',
      subject: 'Bienvenue sur InEat !',
      type: 'welcome',
      idempotencyKey: 'welcome/user-123',
    });
    expect(message.html).toContain('Commencer avec InEat');
    expect(message.text).toContain('Scannez une facture');
  });
});
