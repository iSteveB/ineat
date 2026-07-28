export type TransactionalEmailType =
  | 'password_reset'
  | 'email_verification'
  | 'welcome'
  | 'notification_alert'
  | 'weekly_product_digest'
  | 'daily_product_digest'
  | 'trial_started'
  | 'trial_reminder'
  | 'trial_expired'
  | 'premium_activated'
  | 'payment_failed'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'subscription_changed';

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
