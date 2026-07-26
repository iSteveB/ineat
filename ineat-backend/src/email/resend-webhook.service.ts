import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../prisma/generated/prisma/client';
import { Resend, WebhookEventPayload } from 'resend';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ResendWebhookHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

const isDuplicateEventError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

@Injectable()
export class ResendWebhookService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
  ) {}

  async process(payload: string, headers: ResendWebhookHeaders) {
    const webhookSecret = this.config.get<string>('RESEND_WEBHOOK_SECRET');
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!webhookSecret || !apiKey) {
      throw new BadRequestException('Resend webhook is not configured');
    }

    let event: WebhookEventPayload;
    try {
      event = new Resend(apiKey).webhooks.verify({
        payload,
        headers,
        webhookSecret,
      });
    } catch {
      this.observability.increment('email.webhook.invalid_signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const emailId = 'email_id' in event.data ? event.data.email_id : null;
    const emailType =
      'tags' in event.data ? event.data.tags?.email_type ?? null : null;
    const recipientRef =
      'tags' in event.data ? event.data.tags?.recipient_ref ?? null : null;

    try {
      if (
        recipientRef &&
        (event.type === 'email.bounced' || event.type === 'email.complained')
      ) {
        await this.prisma.emailSuppression.upsert({
          where: { recipientRef },
          create: { recipientRef, reason: event.type },
          update: { reason: event.type },
        });
      }

      await this.prisma.resendWebhookEvent.create({
        data: {
          id: headers.id,
          type: event.type,
          emailId,
          emailType,
          recipientRef,
          eventAt: new Date(event.created_at),
        },
      });
    } catch (error) {
      if (isDuplicateEventError(error)) {
        this.observability.increment('email.webhook.duplicate');
        return { received: true, duplicate: true };
      }
      throw error;
    }

    this.recordEvent(event, emailId, emailType, recipientRef);
    return { received: true, duplicate: false };
  }

  private recordEvent(
    event: WebhookEventPayload,
    emailId: string | null,
    emailType: string | null,
    recipientRef: string | null,
  ) {
    this.observability.increment(`email.webhook.${event.type}`);

    if (event.type === 'email.bounced' || event.type === 'email.complained') {
      this.observability.trackEvent(
        event.type,
        'warn',
        'Resend reported a deliverability issue',
        { emailId, emailType, recipientRef },
      );
      return;
    }

    if (event.type === 'email.failed' || event.type === 'email.suppressed') {
      this.observability.trackEvent(
        event.type,
        'error',
        'Resend reported a failed transactional email',
        { emailId, emailType, recipientRef },
      );
    }
  }
}
