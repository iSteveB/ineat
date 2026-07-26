export type TransactionalEmailType =
  | 'password_reset'
  | 'email_verification'
  | 'welcome';

export interface TransactionalEmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: TransactionalEmailType;
  recipientReference: string;
  idempotencyKey?: string;
}

export interface EmailSendResult {
  messageId: string;
}

export interface EmailTransport {
  send(message: TransactionalEmailMessage): Promise<EmailSendResult>;
}
