import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EmailService } from '../email/email.service';
import type { WeeklyProductDigestItem } from '../email/email.templates';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';

const USER_BATCH_SIZE = 100;
const ITEM_LIMIT = 5;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TIME_ZONE = 'Europe/Paris';

type DigestContent = {
  expired: WeeklyProductDigestItem[];
  expiringSoon: WeeklyProductDigestItem[];
  recentlyAdded: WeeklyProductDigestItem[];
  totals: { expired: number; expiringSoon: number; recentlyAdded: number };
  budget?: { spent: number; amount: number; remaining: number; percentage: number };
};

@Injectable()
export class WeeklyProductDigestService {
  private readonly logger = new Logger(WeeklyProductDigestService.name);
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
          select: {
            id: true,
            email: true,
            firstName: true,
            preferences: true,
            NotificationPreferences: {
              select: { weeklyDigestEnabled: true },
            },
          },
          orderBy: { id: 'asc' },
          take: USER_BATCH_SIZE,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        await Promise.allSettled(
          users.map(async (user) => {
            if (user.NotificationPreferences?.weeklyDigestEnabled === false) {
              return;
            }
            const timeZone = this.getTimeZone(user.preferences);
            if (!this.isSundayAtSix(now, timeZone)) return;
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
    user: {
      id: string;
      email: string;
      firstName: string;
      preferences: unknown;
    },
    now: Date,
    timeZone: string,
  ): Promise<void> {
    const periodKey = this.localDateKey(now, timeZone);
    const existing = await this.prisma.emailDigestDelivery.findUnique({
      where: {
        userId_type_periodKey: {
          userId: user.id,
          type: 'WEEKLY_PRODUCT',
          periodKey,
        },
      },
    });
    if (existing?.status === 'SENT') return;

    const content = await this.buildContent(user.id, now, timeZone);
    if (!this.hasContent(content)) {
      this.observability?.increment('email.weekly_product_digest.empty');
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
            type: 'WEEKLY_PRODUCT',
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
      const result = await this.email.sendWeeklyProductDigest({
        ...content,
        to: user.email,
        userId: user.id,
        firstName: user.firstName,
        periodKey,
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
      this.observability?.increment('email.weekly_product_digest.delivered');
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
      this.logger.error(`Weekly digest failed for user ${user.id}`);
    }
  }

  private async buildContent(
    userId: string,
    now: Date,
    timeZone: string,
  ): Promise<DigestContent> {
    const weekAgo = new Date(now.getTime() - WEEK_MS);
    const expiryLimit = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    const [expiryCandidates, recentItems, recentCount, budget] =
      await Promise.all([
        this.prisma.inventoryItem.findMany({
          where: { userId, expiryDate: { not: null, lte: expiryLimit } },
          select: {
            quantity: true,
            expiryDate: true,
            Product: { select: { name: true } },
          },
          orderBy: { expiryDate: 'asc' },
        }),
        this.prisma.inventoryItem.findMany({
          where: { userId, createdAt: { gte: weekAgo, lte: now } },
          select: {
            quantity: true,
            createdAt: true,
            Product: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: ITEM_LIMIT,
        }),
        this.prisma.inventoryItem.count({
          where: { userId, createdAt: { gte: weekAgo, lte: now } },
        }),
        this.prisma.budget.findFirst({
          where: {
            userId,
            isActive: true,
            periodStart: { lte: now },
            periodEnd: { gte: now },
          },
          select: {
            amount: true,
            Expense: { select: { amount: true } },
          },
          orderBy: { periodStart: 'desc' },
        }),
      ]);

    const expiredCandidates = expiryCandidates.filter(
      (item) => this.daysUntil(item.expiryDate, now, timeZone) < 0,
    );
    const expiringCandidates = expiryCandidates.filter((item) => {
      const days = this.daysUntil(item.expiryDate, now, timeZone);
      return days >= 0 && days <= 7;
    });
    const mapExpiry = (item: (typeof expiryCandidates)[number]) => {
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
    };
    const spent = budget?.Expense.reduce((sum, expense) => sum + expense.amount, 0);

    return {
      expired: expiredCandidates.slice(0, ITEM_LIMIT).map(mapExpiry),
      expiringSoon: expiringCandidates.slice(0, ITEM_LIMIT).map(mapExpiry),
      recentlyAdded: recentItems.map((item) => ({
        name: item.Product.name,
        quantity: item.quantity,
        detail: `ajouté le ${this.formatLocalDate(item.createdAt, timeZone)}`,
      })),
      totals: {
        expired: expiredCandidates.length,
        expiringSoon: expiringCandidates.length,
        recentlyAdded: recentCount,
      },
      ...(budget && spent !== undefined
        ? {
            budget: {
              spent,
              amount: budget.amount,
              remaining: Math.max(budget.amount - spent, 0),
              percentage:
                budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0,
            },
          }
        : {}),
    };
  }

  private hasContent(content: DigestContent): boolean {
    return Boolean(
      content.totals.expired ||
        content.totals.expiringSoon ||
        content.totals.recentlyAdded ||
        content.budget,
    );
  }

  private getTimeZone(preferences: unknown): string {
    const candidate =
      preferences && typeof preferences === 'object' && !Array.isArray(preferences)
        ? ((preferences as Record<string, unknown>).timeZone ??
          (preferences as Record<string, unknown>).timezone)
        : undefined;
    if (typeof candidate === 'string') {
      try {
        new Intl.DateTimeFormat('fr-FR', { timeZone: candidate }).format();
        return candidate;
      } catch {
        this.observability?.increment('email.weekly_product_digest.timezone_invalid');
      }
    }
    return DEFAULT_TIME_ZONE;
  }

  private isSundayAtSix(now: Date, timeZone: string): boolean {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    return (
      parts.find((part) => part.type === 'weekday')?.value === 'Sun' &&
      parts.find((part) => part.type === 'hour')?.value === '18'
    );
  }

  private localDateKey(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private formatLocalDate(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone,
      day: 'numeric',
      month: 'short',
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
