import { createHash } from 'crypto';
import {
  createEmailVerificationEmail,
  createDailyProductDigestEmail,
  createNotificationAlertEmail,
  createPasswordResetEmail,
  createWeeklyProductDigestEmail,
  type WeeklyProductDigestInput,
  type DailyProductDigestInput,
  createWelcomeEmail,
} from './email.templates';
import { ResendEmailTransport } from './resend-email.transport';
import { EmailSendResult, EmailTransport } from './email.types';

let defaultTransport: EmailTransport | undefined;

export const createRecipientReference = (email: string) =>
  createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 24);

const createDefaultTransport = (): EmailTransport => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new Error('Transactional email is not configured');
  }

  return new ResendEmailTransport(
    apiKey,
    from,
    process.env.EMAIL_REPLY_TO?.trim() || undefined,
  );
};

export const getDefaultEmailTransport = (): EmailTransport => {
  defaultTransport ??= createDefaultTransport();
  return defaultTransport;
};

export async function sendPasswordResetEmail(
  input: { to: string; name?: string | null; resetUrl: string },
  transport: EmailTransport = getDefaultEmailTransport(),
): Promise<EmailSendResult> {
  const template = createPasswordResetEmail(input);
  const resetFingerprint = createHash('sha256')
    .update(input.resetUrl)
    .digest('hex')
    .slice(0, 32);

  return transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'password_reset',
    recipientReference: createRecipientReference(input.to),
    idempotencyKey: `password-reset/${resetFingerprint}`,
  });
}

export async function sendNotificationAlertEmail(
  input: {
    to: string;
    title: string;
    message: string;
    actionUrl: string;
    notificationId: string;
    occurrenceVersion: number;
  },
  transport: EmailTransport = getDefaultEmailTransport(),
): Promise<EmailSendResult> {
  const template = createNotificationAlertEmail(input);

  return transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'notification_alert',
    recipientReference: createRecipientReference(input.to),
    idempotencyKey: `notification/${input.notificationId}/${input.occurrenceVersion}/email`,
  });
}

export async function sendEmailVerificationEmail(
  input: { to: string; name?: string | null; verificationUrl: string },
  transport: EmailTransport = getDefaultEmailTransport(),
): Promise<EmailSendResult> {
  const template = createEmailVerificationEmail(input);
  const verificationFingerprint = createHash('sha256')
    .update(input.verificationUrl)
    .digest('hex')
    .slice(0, 32);

  return transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'email_verification',
    recipientReference: createRecipientReference(input.to),
    idempotencyKey: `email-verification/${verificationFingerprint}`,
  });
}

export async function sendWelcomeEmail(
  input: {
    to: string;
    firstName?: string | null;
    appUrl: string;
    userId: string;
  },
  transport: EmailTransport = getDefaultEmailTransport(),
): Promise<EmailSendResult> {
  const template = createWelcomeEmail(input);

  return transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'welcome',
    recipientReference: createRecipientReference(input.to),
    idempotencyKey: `welcome/${input.userId}`,
  });
}

export async function sendWeeklyProductDigestEmail(
  input: WeeklyProductDigestInput & {
    to: string;
    userId: string;
    periodKey: string;
  },
  transport: EmailTransport = getDefaultEmailTransport(),
): Promise<EmailSendResult> {
  const template = createWeeklyProductDigestEmail(input);

  return transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'weekly_product_digest',
    recipientReference: createRecipientReference(input.to),
    idempotencyKey: `weekly-product-digest/${input.userId}/${input.periodKey}`,
  });
}

export async function sendDailyProductDigestEmail(
  input: DailyProductDigestInput & {
    to: string;
    userId: string;
    periodKey: string;
  },
  transport: EmailTransport = getDefaultEmailTransport(),
): Promise<EmailSendResult> {
  const template = createDailyProductDigestEmail(input);
  return transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'daily_product_digest',
    recipientReference: createRecipientReference(input.to),
    idempotencyKey: `daily-product-digest/${input.userId}/${input.periodKey}`,
  });
}
