import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NotificationType } from '../../prisma/generated/prisma/client';
import { EmailService } from '../email/email.service';
import type { WeeklyProductDigestItem } from '../email/email.templates';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';

const USER_BATCH_SIZE = 100;
const ITEM_LIMIT = 5;
const DEFAULT_TIME_ZONE = 'Europe/Paris';

@Injectable()
export class DailyProductDigestService {
  private readonly logger = new Logger(DailyProductDigestService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    @Optional() private readonly observability?: ObservabilityService,
  ) {}

  async sendDueDigests(now = new Date()): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    let cursor: string | undefined;

    try {
      do {
        const users = await this.prisma.user.findMany({
          where: {
            NotificationPreferences: { dailyDigestEnabled: true },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            preferences: true,
          },
          orderBy: { id: 'asc' },
          take: USER_BATCH_SIZE,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        await Promise.allSettled(
          users.map(async (user) => {
            const timeZone = this.getTimeZone(user.preferences);
            if (!this.isConfiguredHour(now, timeZone)) return;
            await this.sendUserDigest(user, now, timeZone);
          }),
        );

        cursor = users.at(-1)?.id;
        if (users.length < USER_BATCH_SIZE) break;
      } while (cursor);
    } finally {
      this.isRunning = false;
    }
  }

  private async sendUserDigest(
    user: { id: string; email: string; firstName: string },
    now: Date,
    timeZone: string,
  ): Promise<void> {
    const periodKey = this.localDateKey(now, timeZone);
    const existing = await this.prisma.emailDigestDelivery.findUnique({
      where: {
        userId_type_periodKey: {
          userId: user.id,
          type: 'DAILY_PRODUCT',
          periodKey,
        },
      },
    });
    if (existing?.status === 'SENT') return;

    const [urgentItems, totalUrgentItems, budgetNotification] =
      await this.buildContent(user.id, now, timeZone);
    if (totalUrgentItems === 0 && !budgetNotification) {
      this.observability?.increment('email.daily_product_digest.empty');
      return;
    }

    const delivery = existing
      ? await this.prisma.emailDigestDelivery.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            attemptCount: { increment: 1 },
            errorMessage: null,
            updatedAt: now,
          },
        })
      : await this.prisma.emailDigestDelivery.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            type: 'DAILY_PRODUCT',
            periodKey,
            attemptCount: 1,
            updatedAt: now,
          },
        });
    const appUrl = (process.env.FRONTEND_URL || 'https://ineat.store').replace(
      /\/$/,
      '',
    );

    try {
      const result = await this.email.sendDailyProductDigest({
        to: user.email,
        userId: user.id,
        firstName: user.firstName,
        periodKey,
        urgentItems,
        totalUrgentItems,
        budgetAlert: budgetNotification?.message,
        inventoryUrl: `${appUrl}/app/inventory`,
        budgetUrl: `${appUrl}/app/budget`,
      });
      await this.prisma.emailDigestDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SENT',
          providerMessageId: result.messageId,
          sentAt: new Date(),
          updatedAt: new Date(),
        },
      });
      this.observability?.increment('email.daily_product_digest.delivered');
    } catch (error) {
      await this.prisma.emailDigestDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          errorMessage:
            error instanceof Error ? error.message.slice(0, 500) : 'Unknown',
          updatedAt: new Date(),
        },
      });
      this.logger.error(`Daily digest failed for user ${user.id}`);
    }
  }

  private async buildContent(
    userId: string,
    now: Date,
    timeZone: string,
  ): Promise<[WeeklyProductDigestItem[], number, { message: string } | null]> {
    const limit = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [candidates, budgetNotification] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { userId, expiryDate: { not: null, lte: limit } },
        select: {
          quantity: true,
          expiryDate: true,
          Product: { select: { name: true } },
        },
        orderBy: { expiryDate: 'asc' },
      }),
      this.prisma.notification.findFirst({
        where: {
          userId,
          type: NotificationType.BUDGET,
          lastOccurredAt: { gte: since, lte: now },
          resolvedAt: null,
          dismissedAt: null,
        },
        select: { message: true },
        orderBy: { lastOccurredAt: 'desc' },
      }),
    ]);
    const urgent = candidates.filter(
      (item) => this.daysUntil(item.expiryDate, now, timeZone) <= 2,
    );
    return [
      urgent.slice(0, ITEM_LIMIT).map((item) => {
        const days = this.daysUntil(item.expiryDate, now, timeZone);
        return {
          name: item.Product.name,
          quantity: item.quantity,
          detail:
            days < 0
              ? `périmé depuis ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`
              : days === 0
                ? "expire aujourd'hui"
                : `expire dans ${days} jour${days > 1 ? 's' : ''}`,
        };
      }),
      urgent.length,
      budgetNotification,
    ];
  }

  private isConfiguredHour(now: Date, timeZone: string): boolean {
    const configured = Number(process.env.DAILY_DIGEST_HOUR);
    const expectedHour =
      Number.isInteger(configured) && configured >= 0 && configured <= 23
        ? configured
        : 8;
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(now)
        .find((part) => part.type === 'hour')?.value,
    );
    return hour === expectedHour;
  }

  private getTimeZone(preferences: unknown): string {
    const candidate =
      preferences &&
      typeof preferences === 'object' &&
      !Array.isArray(preferences)
        ? ((preferences as Record<string, unknown>).timeZone ??
          (preferences as Record<string, unknown>).timezone)
        : undefined;
    if (typeof candidate === 'string') {
      try {
        new Intl.DateTimeFormat('fr-FR', { timeZone: candidate }).format();
        return candidate;
      } catch {
        this.observability?.increment(
          'email.daily_product_digest.timezone_invalid',
        );
      }
    }
    return DEFAULT_TIME_ZONE;
  }

  private localDateKey(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private daysUntil(date: Date | null, now: Date, timeZone: string): number {
    if (!date) return 0;
    const dayNumber = (value: Date) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(value);
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((item) => item.type === type)?.value);
      return Date.UTC(part('year'), part('month') - 1, part('day'));
    };
    return Math.round((dayNumber(date) - dayNumber(now)) / 86_400_000);
  }
}
