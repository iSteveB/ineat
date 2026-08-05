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
  createTrialStartedEmail,
  createTrialReminderEmail,
  createTrialExpiredEmail,
  type TrialEmailInput,
  type BillingEmailInput,
  createPremiumActivatedEmail,
  createPaymentFailedEmail,
  createSubscriptionCancelledEmail,
  createSubscriptionChangedEmail,
  createQuotaEmail,
  type QuotaEmailInput,
  createAccountDeletedEmail,
  type AccountDeletedEmailInput,
  createSupportRequestEmail,
  type SupportRequestEmailInput,
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

export async function sendSupportRequestEmail(
  input: SupportRequestEmailInput & { to: string },
  transport: EmailTransport = getDefaultEmailTransport(),
): Promise<EmailSendResult> {
  const template = createSupportRequestEmail(input);

  return transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'support_request',
    recipientReference: createRecipientReference(input.to),
    replyTo: input.user.email,
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

const sendTrialEmail = async (
  type: 'trial_started' | 'trial_reminder' | 'trial_expired',
  input: TrialEmailInput & { to: string; userId: string },
  template: ReturnType<typeof createTrialStartedEmail>,
  transport: EmailTransport,
) =>
  transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type,
    recipientReference: createRecipientReference(input.to),
    idempotencyKey: `${type}/${input.userId}/${input.trialEndsAt.toISOString()}`,
  });

export const sendTrialStartedEmail = (
  input: TrialEmailInput & { to: string; userId: string },
  transport: EmailTransport = getDefaultEmailTransport(),
) =>
  sendTrialEmail(
    'trial_started',
    input,
    createTrialStartedEmail(input),
    transport,
  );

export const sendTrialReminderEmail = (
  input: TrialEmailInput & { to: string; userId: string },
  transport: EmailTransport = getDefaultEmailTransport(),
) =>
  sendTrialEmail(
    'trial_reminder',
    input,
    createTrialReminderEmail(input),
    transport,
  );

export const sendTrialExpiredEmail = (
  input: TrialEmailInput & { to: string; userId: string },
  transport: EmailTransport = getDefaultEmailTransport(),
) =>
  sendTrialEmail(
    'trial_expired',
    input,
    createTrialExpiredEmail(input),
    transport,
  );

const sendBillingEmail = async (
  type:
    | 'premium_activated'
    | 'payment_failed'
    | 'subscription_cancelled'
    | 'subscription_expired'
    | 'subscription_changed',
  input: BillingEmailInput & { to: string; userId: string; eventId: string },
  template: ReturnType<typeof createPremiumActivatedEmail>,
  transport: EmailTransport,
) =>
  transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type,
    recipientReference: createRecipientReference(input.to),
    idempotencyKey: `billing/${type}/${input.eventId}`,
  });

export const sendPremiumActivatedEmail = (
  input: BillingEmailInput & { to: string; userId: string; eventId: string },
  transport: EmailTransport = getDefaultEmailTransport(),
) =>
  sendBillingEmail(
    'premium_activated',
    input,
    createPremiumActivatedEmail(input),
    transport,
  );

export const sendPaymentFailedEmail = (
  input: BillingEmailInput & { to: string; userId: string; eventId: string },
  transport: EmailTransport = getDefaultEmailTransport(),
) =>
  sendBillingEmail(
    'payment_failed',
    input,
    createPaymentFailedEmail(input),
    transport,
  );

export const sendSubscriptionCancelledEmail = (
  input: BillingEmailInput & {
    to: string;
    userId: string;
    eventId: string;
    effective: boolean;
  },
  transport: EmailTransport = getDefaultEmailTransport(),
) =>
  sendBillingEmail(
    input.effective ? 'subscription_expired' : 'subscription_cancelled',
    input,
    createSubscriptionCancelledEmail(input, input.effective),
    transport,
  );

export const sendSubscriptionChangedEmail = (
  input: BillingEmailInput & { to: string; userId: string; eventId: string },
  transport: EmailTransport = getDefaultEmailTransport(),
) =>
  sendBillingEmail(
    'subscription_changed',
    input,
    createSubscriptionChangedEmail(input),
    transport,
  );

export const sendQuotaEmail = (
  input: QuotaEmailInput & {
    to: string;
    userId: string;
    quotaId: string;
    reached: boolean;
  },
  transport: EmailTransport = getDefaultEmailTransport(),
) => {
  const template = createQuotaEmail(input, input.reached);
  const type = input.reached ? 'quota_reached' : 'quota_warning';
  return transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type,
    recipientReference: createRecipientReference(input.to),
    idempotencyKey: `quota/${input.quotaId}/${type}`,
  });
};

export const sendAccountDeletedEmail = (
  input: AccountDeletedEmailInput & { to: string; userId: string },
  transport: EmailTransport = getDefaultEmailTransport(),
) => {
  const template = createAccountDeletedEmail(input);
  return transport.send({
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'account_deleted',
    recipientReference: createRecipientReference(input.to),
    idempotencyKey: `account-deleted/${input.userId}`,
  });
};
