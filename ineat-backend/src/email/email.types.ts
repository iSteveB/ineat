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
  | 'subscription_changed'
  | 'quota_warning'
  | 'quota_reached'
  | 'account_deleted'
  | 'support_request';

export interface TransactionalEmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: TransactionalEmailType;
  recipientReference: string;
  idempotencyKey?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  messageId: string;
}

export interface EmailTransport {
  send(message: TransactionalEmailMessage): Promise<EmailSendResult>;
}
