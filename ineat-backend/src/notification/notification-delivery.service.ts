import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Notification,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
} from '../../prisma/generated/prisma/client';
import { EmailService } from '../email/email.service';
import { createRecipientReference } from '../email/email-sender';
import { PrismaService } from '../prisma/prisma.service';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async dispatchOccurrence(notification: Notification): Promise<void> {
    const [preferences, user] = await Promise.all([
      this.prisma.notificationPreferences.findUnique({
        where: { userId: notification.userId },
      }),
      this.prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true },
      }),
    ]);

    if (!user) {
      return;
    }

    if (preferences?.emailEnabled) {
      const delivery = await this.createDelivery(
        notification,
        NotificationChannel.EMAIL,
      );
      await this.processEmailDelivery(delivery.id);
    }

    if (preferences?.pushEnabled) {
      await this.prisma.notificationDelivery.upsert({
        where: {
          notificationId_channel_occurrenceVersion: {
            notificationId: notification.id,
            channel: NotificationChannel.PUSH,
            occurrenceVersion: notification.occurrenceVersion,
          },
        },
        create: {
          id: randomUUID(),
          notificationId: notification.id,
          channel: NotificationChannel.PUSH,
          occurrenceVersion: notification.occurrenceVersion,
          status: NotificationDeliveryStatus.SKIPPED,
          errorMessage: 'Push provider is not configured',
          updatedAt: new Date(),
        },
        update: {},
      });
    }
  }

  async retryPendingDeliveries(): Promise<void> {
    const now = new Date();
    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: {
        channel: NotificationChannel.EMAIL,
        status: {
          in: [
            NotificationDeliveryStatus.PENDING,
            NotificationDeliveryStatus.FAILED,
          ],
        },
        attemptCount: { lt: MAX_ATTEMPTS },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    await Promise.allSettled(
      deliveries.map(({ id }) => this.processEmailDelivery(id)),
    );
  }

  private createDelivery(
    notification: Notification,
    channel: NotificationChannel,
  ) {
    return this.prisma.notificationDelivery.upsert({
      where: {
        notificationId_channel_occurrenceVersion: {
          notificationId: notification.id,
          channel,
          occurrenceVersion: notification.occurrenceVersion,
        },
      },
      create: {
        id: randomUUID(),
        notificationId: notification.id,
        channel,
        occurrenceVersion: notification.occurrenceVersion,
        updatedAt: new Date(),
      },
      update: {},
    });
  }

  private async processEmailDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: { Notification: { include: { User: true } } },
    });

    if (!delivery || delivery.channel !== NotificationChannel.EMAIL) {
      return;
    }

    const preferences = await this.prisma.notificationPreferences.findUnique({
      where: { userId: delivery.Notification.userId },
    });
    const typeEnabled =
      delivery.Notification.type === NotificationType.EXPIRY
        ? preferences?.expiry
        : delivery.Notification.type === NotificationType.BUDGET
          ? preferences?.budget
          : preferences?.system;

    if (!preferences?.emailEnabled || !typeEnabled) {
      await this.markTerminal(
        delivery.id,
        NotificationDeliveryStatus.SKIPPED,
        'Email notifications are disabled by user preferences',
      );
      return;
    }

    if (!this.isEmailEnabled()) {
      await this.markTerminal(
        delivery.id,
        NotificationDeliveryStatus.SKIPPED,
        'Transactional email is disabled',
      );
      return;
    }

    const recipientReference = createRecipientReference(
      delivery.Notification.User.email,
    );
    const suppression = await this.prisma.emailSuppression.findUnique({
      where: { recipientRef: recipientReference },
      select: { recipientRef: true },
    });

    if (suppression) {
      await this.markTerminal(
        delivery.id,
        NotificationDeliveryStatus.SUPPRESSED,
        'Recipient is suppressed',
      );
      return;
    }

    const claim = await this.prisma.notificationDelivery.updateMany({
      where: {
        id: delivery.id,
        status: {
          in: [
            NotificationDeliveryStatus.PENDING,
            NotificationDeliveryStatus.FAILED,
          ],
        },
        attemptCount: { lt: MAX_ATTEMPTS },
      },
      data: {
        status: NotificationDeliveryStatus.PROCESSING,
        attemptCount: { increment: 1 },
        nextAttemptAt: null,
        updatedAt: new Date(),
      },
    });

    if (claim.count === 0) {
      return;
    }

    try {
      const result = await this.email.sendNotificationAlert({
        to: delivery.Notification.User.email,
        title: delivery.Notification.title,
        message: delivery.Notification.message,
        actionUrl: this.buildActionUrl(delivery.Notification.referenceType),
        notificationId: delivery.notificationId,
        occurrenceVersion: delivery.occurrenceVersion,
      });
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          providerMessageId: result.messageId,
          errorMessage: null,
          sentAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      const attemptCount = delivery.attemptCount + 1;
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          errorMessage: message.slice(0, 500),
          nextAttemptAt:
            attemptCount < MAX_ATTEMPTS
              ? new Date(Date.now() + RETRY_DELAYS_MS[attemptCount - 1])
              : null,
          updatedAt: new Date(),
        },
      });
      this.logger.warn(
        `Notification delivery ${delivery.id} failed: ${message}`,
      );
    }
  }

  private markTerminal(
    id: string,
    status: NotificationDeliveryStatus,
    errorMessage: string,
  ) {
    return this.prisma.notificationDelivery.update({
      where: { id },
      data: { status, errorMessage, updatedAt: new Date() },
    });
  }

  private isEmailEnabled(): boolean {
    return process.env.NODE_ENV === 'production'
      ? process.env.EMAIL_ENABLED !== 'false'
      : process.env.EMAIL_ENABLED === 'true';
  }

  private buildActionUrl(referenceType: string | null): string {
    const baseUrl = (
      process.env.FRONTEND_URL ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
    const path = referenceType?.startsWith('budget:')
      ? '/app/budget'
      : referenceType === 'inventory_item'
        ? '/app/inventory'
        : '/app/notifications';
    return `${baseUrl}${path}`;
  }
}
