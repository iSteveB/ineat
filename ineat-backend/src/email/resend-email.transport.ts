import { Resend } from 'resend';
import {
  EmailSendResult,
  EmailTransport,
  TransactionalEmailMessage,
} from './email.types';

export class ResendEmailTransport implements EmailTransport {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
    private readonly replyTo?: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(
    message: TransactionalEmailMessage,
  ): Promise<EmailSendResult> {
    const { data, error } = await this.client.emails.send(
      {
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo ?? this.replyTo,
        tags: [
          { name: 'email_type', value: message.type },
          { name: 'recipient_ref', value: message.recipientReference },
        ],
        headers: {
          'X-Entity-Ref-ID': message.idempotencyKey ?? message.type,
        },
      },
      message.idempotencyKey
        ? { idempotencyKey: message.idempotencyKey }
        : undefined,
    );

    if (error || !data?.id) {
      throw new Error(error?.message ?? 'Resend did not return a message ID');
    }

    return { messageId: data.id };
  }
}
