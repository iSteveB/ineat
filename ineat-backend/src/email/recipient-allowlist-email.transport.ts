import {
  type EmailSendResult,
  type EmailTransport,
  type TransactionalEmailMessage,
} from './email.types';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const parseAllowedEmailRecipients = (value?: string) =>
  new Set(
    (value ?? '')
      .split(',')
      .map(normalizeEmail)
      .filter(Boolean),
  );

export class EmailRecipientNotAllowedError extends Error {
  constructor() {
    super('Email recipient is not allowed in this environment');
    this.name = 'EmailRecipientNotAllowedError';
  }
}

export class RecipientAllowlistEmailTransport implements EmailTransport {
  private readonly allowedRecipients: Set<string>;

  constructor(
    private readonly transport: EmailTransport,
    allowedRecipients: Iterable<string>,
  ) {
    this.allowedRecipients = new Set(
      Array.from(allowedRecipients, normalizeEmail),
    );
  }

  async send(message: TransactionalEmailMessage): Promise<EmailSendResult> {
    if (!this.allowedRecipients.has(normalizeEmail(message.to))) {
      throw new EmailRecipientNotAllowedError();
    }

    return this.transport.send(message);
  }
}
