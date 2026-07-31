import { Injectable } from '@nestjs/common';
import { ObservabilityService } from '../observability/observability.service';
import {
  getDefaultEmailTransport,
  sendEmailVerificationEmail,
  sendDailyProductDigestEmail,
  sendNotificationAlertEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendWeeklyProductDigestEmail,
  sendTrialStartedEmail,
  sendTrialReminderEmail,
  sendTrialExpiredEmail,
  sendPremiumActivatedEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionChangedEmail,
  sendQuotaEmail,
  sendAccountDeletedEmail,
} from './email-sender';
import { EmailTransport } from './email.types';
import type {
  DailyProductDigestInput,
  TrialEmailInput,
  BillingEmailInput,
  QuotaEmailInput,
  WeeklyProductDigestInput,
} from './email.templates';

@Injectable()
export class EmailService {
  constructor(private readonly observability: ObservabilityService) {}

  async sendPasswordReset(input: {
    to: string;
    name?: string | null;
    resetUrl: string;
  }) {
    return this.sendObserved('password_reset', (transport) =>
      sendPasswordResetEmail(input, transport),
    );
  }

  async sendEmailVerification(input: {
    to: string;
    name?: string | null;
    verificationUrl: string;
  }) {
    return this.sendObserved('email_verification', (transport) =>
      sendEmailVerificationEmail(input, transport),
    );
  }

  async sendWelcome(input: {
    to: string;
    firstName?: string | null;
    appUrl: string;
    userId: string;
  }) {
    return this.sendObserved('welcome', (transport) =>
      sendWelcomeEmail(input, transport),
    );
  }

  async sendNotificationAlert(input: {
    to: string;
    title: string;
    message: string;
    actionUrl: string;
    notificationId: string;
    occurrenceVersion: number;
  }) {
    return this.sendObserved('notification_alert', (transport) =>
      sendNotificationAlertEmail(input, transport),
    );
  }

  async sendWeeklyProductDigest(
    input: WeeklyProductDigestInput & {
      to: string;
      userId: string;
      periodKey: string;
    },
  ) {
    return this.sendObserved('weekly_product_digest', (transport) =>
      sendWeeklyProductDigestEmail(input, transport),
    );
  }

  async sendDailyProductDigest(
    input: DailyProductDigestInput & {
      to: string;
      userId: string;
      periodKey: string;
    },
  ) {
    return this.sendObserved('daily_product_digest', (transport) =>
      sendDailyProductDigestEmail(input, transport),
    );
  }

  async sendTrialStarted(
    input: TrialEmailInput & { to: string; userId: string },
  ) {
    return this.sendObserved('trial_started', (transport) =>
      sendTrialStartedEmail(input, transport),
    );
  }

  async sendTrialReminder(
    input: TrialEmailInput & { to: string; userId: string },
  ) {
    return this.sendObserved('trial_reminder', (transport) =>
      sendTrialReminderEmail(input, transport),
    );
  }

  async sendTrialExpired(
    input: TrialEmailInput & { to: string; userId: string },
  ) {
    return this.sendObserved('trial_expired', (transport) =>
      sendTrialExpiredEmail(input, transport),
    );
  }

  async sendPremiumActivated(
    input: BillingEmailInput & { to: string; userId: string; eventId: string },
  ) {
    return this.sendObserved('premium_activated', (transport) =>
      sendPremiumActivatedEmail(input, transport),
    );
  }

  async sendPaymentFailed(
    input: BillingEmailInput & { to: string; userId: string; eventId: string },
  ) {
    return this.sendObserved('payment_failed', (transport) =>
      sendPaymentFailedEmail(input, transport),
    );
  }

  async sendSubscriptionCancelled(
    input: BillingEmailInput & {
      to: string;
      userId: string;
      eventId: string;
      effective: boolean;
    },
  ) {
    return this.sendObserved(
      input.effective ? 'subscription_expired' : 'subscription_cancelled',
      (transport) => sendSubscriptionCancelledEmail(input, transport),
    );
  }

  async sendSubscriptionChanged(
    input: BillingEmailInput & { to: string; userId: string; eventId: string },
  ) {
    return this.sendObserved('subscription_changed', (transport) =>
      sendSubscriptionChangedEmail(input, transport),
    );
  }

  async sendQuota(
    input: QuotaEmailInput & {
      to: string;
      userId: string;
      quotaId: string;
      reached: boolean;
    },
  ) {
    return this.sendObserved(
      input.reached ? 'quota_reached' : 'quota_warning',
      (transport) => sendQuotaEmail(input, transport),
    );
  }

  async sendAccountDeleted(input: {
    to: string;
    userId: string;
    firstName?: string | null;
  }) {
    return this.sendObserved('account_deleted', (transport) =>
      sendAccountDeletedEmail(input, transport),
    );
  }

  private async sendObserved<T>(
    type: string,
    send: (transport: EmailTransport) => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();

    try {
      const result = await send(getDefaultEmailTransport());
      this.observability.increment(`email.${type}.sent`);
      this.observability.recordTiming(
        'email.send.duration',
        Date.now() - startedAt,
        { type },
      );
      return result;
    } catch (error) {
      const errorName =
        error instanceof Error ? error.constructor.name : 'UnknownError';
      this.observability.increment(`email.${type}.failed`);
      this.observability.trackEvent(
        'email.send.failed',
        'error',
        'Transactional email send failed',
        { type, errorName },
      );
      throw error;
    }
  }
}
