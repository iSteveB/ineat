import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendWeeklyProductDigestEmail,
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

  it('renders the weekly product digest with a period idempotency key', async () => {
    const send = jest.fn().mockResolvedValue({ messageId: 'digest-123' });

    await sendWeeklyProductDigestEmail(
      {
        to: 'steve@example.com',
        userId: 'user-123',
        periodKey: '2026-08-02',
        firstName: 'Steve',
        expired: [],
        expiringSoon: [
          { name: 'Yaourts', quantity: 2, detail: 'expire dans 2 jours' },
        ],
        recentlyAdded: [],
        totals: { expired: 0, expiringSoon: 1, recentlyAdded: 0 },
        budget: {
          spent: 75,
          amount: 100,
          remaining: 25,
          percentage: 75,
        },
        inventoryUrl: 'https://ineat.store/app/inventory',
        budgetUrl: 'https://ineat.store/app/budget',
      },
      { send },
    );

    const message = send.mock.calls[0][0] as TransactionalEmailMessage;
    expect(message).toMatchObject({
      type: 'weekly_product_digest',
      idempotencyKey: 'weekly-product-digest/user-123/2026-08-02',
    });
    expect(message.html).toContain('À consommer dans les 7 jours');
    expect(message.text).toContain('75,00 € dépensés');
  });
});
