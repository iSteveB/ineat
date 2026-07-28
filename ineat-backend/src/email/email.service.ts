import { Injectable } from '@nestjs/common';
import { ObservabilityService } from '../observability/observability.service';
import {
  getDefaultEmailTransport,
  sendEmailVerificationEmail,
  sendNotificationAlertEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from './email-sender';
import { EmailTransport } from './email.types';

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
