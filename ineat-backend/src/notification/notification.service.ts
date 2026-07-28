import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import {
  Notification,
  NotificationType,
} from '../../prisma/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ObservabilityService } from '../observability/observability.service';
import { NotificationDeliveryService } from './notification-delivery.service';

type CreateOrUpdateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string | null;
  referenceType?: string | null;
};

type ListNotificationsOptions = {
  includeRead?: boolean;
  limit?: number;
  cursor?: string;
};

type NotificationPage = {
  items: Notification[];
  nextCursor: string | null;
  hasNextPage: boolean;
  unreadCount: number;
};

export type NotificationPreferences = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  expiry: boolean;
  budget: boolean;
  system: boolean;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: false,
  pushEnabled: false,
  expiry: true,
  budget: true,
  system: true,
};

const EXPIRY_BATCH_SIZE = 100;

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly delivery?: NotificationDeliveryService,
    @Optional() private readonly observability?: ObservabilityService,
  ) {}

  async listNotifications(
    userId: string,
    options: ListNotificationsOptions = {},
  ): Promise<NotificationPage> {
    const limit = this.normalizeLimit(options.limit);
    const cursor = options.cursor
      ? this.decodeCursor(options.cursor)
      : undefined;
    const activeWhere = {
      userId,
      resolvedAt: null,
      dismissedAt: null,
    } as const;
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          ...activeWhere,
          ...(options.includeRead ? {} : { isRead: false }),
          ...(cursor
            ? {
                OR: [
                  { lastOccurredAt: { lt: cursor.lastOccurredAt } },
                  {
                    lastOccurredAt: cursor.lastOccurredAt,
                    id: { lt: cursor.id },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ lastOccurredAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      this.prisma.notification.count({
        where: { ...activeWhere, isRead: false },
      }),
    ]);
    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const lastItem = items.at(-1);

    return {
      items,
      hasNextPage,
      nextCursor:
        hasNextPage && lastItem
          ? this.encodeCursor(lastItem.lastOccurredAt, lastItem.id)
          : null,
      unreadCount,
    };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        resolvedAt: null,
        dismissedAt: null,
      },
    });
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const preferences = await this.prisma.notificationPreferences.findUnique({
      where: { userId },
      select: {
        inAppEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        expiry: true,
        budget: true,
        system: true,
      },
    });

    return preferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
  }

  async updatePreferences(
    userId: string,
    changes: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const allowedKeys = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as Array<
      keyof NotificationPreferences
    >;
    const data: Partial<NotificationPreferences> = {};

    for (const key of allowedKeys) {
      const value = changes[key];
      if (value !== undefined) {
        if (typeof value !== 'boolean') {
          throw new BadRequestException(`Préférence ${key} invalide`);
        }
        data[key] = value;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Aucune préférence valide fournie');
    }

    const now = new Date();
    const preferences = await this.prisma.notificationPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...data,
        updatedAt: now,
      },
      update: { ...data, updatedAt: now },
      select: {
        inAppEnabled: true,
        emailEnabled: true,
        pushEnabled: true,
        expiry: true,
        budget: true,
        system: true,
      },
    });

    for (const [key, value] of Object.entries(data)) {
      if (value === false) {
        this.observability?.increment(
          `notifications.preferences.disabled.${key}`,
        );
      }
    }

    await this.synchronizeUser(userId);
    return preferences;
  }

  async synchronizeUser(userId: string): Promise<void> {
    await Promise.all([
      this.synchronizeExpiryNotifications(userId),
      this.synchronizeBudgetNotifications(userId),
    ]);
  }

  async synchronizeExpiryNotifications(userId: string): Promise<void> {
    await this.syncExpiryNotifications(userId);
  }

  async synchronizeBudgetNotifications(userId: string): Promise<void> {
    await this.syncBudgetNotifications(userId);
  }

  async markAsRead(
    userId: string,
    notificationId: string,
    isRead = true,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification introuvable');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead, updatedAt: new Date() },
    });
    this.observability?.increment('notifications.actions.mark_read');
    return updated;
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        resolvedAt: null,
        dismissedAt: null,
      },
      data: { isRead: true, updatedAt: new Date() },
    });

    this.observability?.increment(
      'notifications.actions.mark_all_read',
      result.count,
    );

    return { count: result.count };
  }

  async dismiss(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, resolvedAt: null },
    });

    if (!notification) {
      throw new NotFoundException('Notification introuvable');
    }

    const now = new Date();
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { dismissedAt: now, isRead: true, updatedAt: now },
    });
    this.observability?.increment('notifications.actions.dismiss');
    return updated;
  }

  private async syncExpiryNotifications(userId: string): Promise<void> {
    if (!(await this.isInAppTypeEnabled(userId, NotificationType.EXPIRY))) {
      await this.resolveMissingNotifications(
        userId,
        NotificationType.EXPIRY,
        [],
      );
      return;
    }

    const timeZone = await this.getUserTimeZone(userId);
    const limitDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const activeReferences: Array<{
      referenceId: string;
      referenceType: string;
    }> = [];
    let cursor: string | undefined;

    do {
      const items = await this.prisma.inventoryItem.findMany({
        where: {
          userId,
          expiryDate: {
            not: null,
            lte: limitDate,
          },
        },
        include: { Product: true },
        orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
        take: EXPIRY_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      await Promise.all(
        items.map((item) => {
          const days = this.daysUntil(item.expiryDate, timeZone);
          if (days > 5) {
            return Promise.resolve();
          }
          activeReferences.push({
            referenceId: item.id,
            referenceType: 'inventory_item',
          });
          const productName = item.Product?.name ?? 'Un produit';

          return this.createOrUpdateNotification({
            userId,
            type: NotificationType.EXPIRY,
            title:
              days < 0
                ? 'Produit périmé'
                : days <= 2
                  ? 'Produit à consommer très vite'
                  : 'Produit bientôt périmé',
            message:
              days < 0
                ? `${productName} est périmé depuis ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}.`
                : `${productName} expire dans ${days} jour${days > 1 ? 's' : ''}.`,
            referenceId: item.id,
            referenceType: 'inventory_item',
          });
        }),
      );
      cursor = items.at(-1)?.id;

      if (items.length < EXPIRY_BATCH_SIZE) {
        break;
      }
    } while (cursor);

    await this.resolveMissingNotifications(
      userId,
      NotificationType.EXPIRY,
      activeReferences,
    );
  }

  private async syncBudgetNotifications(userId: string): Promise<void> {
    if (!(await this.isInAppTypeEnabled(userId, NotificationType.BUDGET))) {
      await this.resolveMissingNotifications(
        userId,
        NotificationType.BUDGET,
        [],
      );
      return;
    }

    const now = new Date();
    const budget = await this.prisma.budget.findFirst({
      where: {
        userId,
        isActive: true,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      include: { Expense: true },
      orderBy: { periodStart: 'desc' },
    });

    if (!budget || budget.amount <= 0) {
      await this.resolveMissingNotifications(
        userId,
        NotificationType.BUDGET,
        [],
      );
      return;
    }

    const spent = budget.Expense.reduce(
      (total, expense) => total + expense.amount,
      0,
    );
    const percentage = (spent / budget.amount) * 100;

    if (percentage < 75) {
      await this.resolveMissingNotifications(
        userId,
        NotificationType.BUDGET,
        [],
      );
      return;
    }

    const alert =
      percentage >= 100
        ? {
            key: 'over_budget',
            title: 'Budget dépassé',
            message: `Votre budget est dépassé de ${(spent - budget.amount).toFixed(2)}€.`,
          }
        : percentage >= 90
          ? {
              key: 'threshold_90',
              title: 'Budget presque épuisé',
              message: `Vous avez utilisé ${percentage.toFixed(0)}% de votre budget mensuel.`,
            }
          : {
              key: 'threshold_75',
              title: 'Budget à surveiller',
              message: `Vous avez utilisé ${percentage.toFixed(0)}% de votre budget mensuel.`,
            };

    await this.createOrUpdateNotification({
      userId,
      type: NotificationType.BUDGET,
      title: alert.title,
      message: alert.message,
      referenceId: budget.id,
      referenceType: `budget:${alert.key}`,
    });

    await this.resolveMissingNotifications(userId, NotificationType.BUDGET, [
      {
        referenceId: budget.id,
        referenceType: `budget:${alert.key}`,
      },
    ]);
  }

  private async createOrUpdateNotification(
    data: CreateOrUpdateNotificationInput,
  ): Promise<Notification> {
    const deduplicationKey = this.buildDeduplicationKey(data);
    const existing = await this.prisma.notification.findUnique({
      where: { deduplicationKey },
    });
    const occurredAt = new Date();
    const severityChanged = existing?.title !== data.title;
    const isNewOccurrence =
      existing !== null && (severityChanged || existing.resolvedAt !== null);

    const notification = await this.prisma.notification.upsert({
      where: { deduplicationKey },
      create: {
        id: randomUUID(),
        deduplicationKey,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        lastOccurredAt: occurredAt,
        updatedAt: occurredAt,
      },
      update: {
        title: data.title,
        message: data.message,
        resolvedAt: null,
        lastOccurredAt: occurredAt,
        ...(isNewOccurrence
          ? {
              isRead: false,
              dismissedAt: null,
              occurrenceVersion: { increment: 1 },
            }
          : {}),
        updatedAt: occurredAt,
      },
    });

    if (!existing || isNewOccurrence) {
      this.observability?.increment(
        existing
          ? 'notifications.occurrences.reopened'
          : 'notifications.occurrences.created',
      );
      await this.delivery?.dispatchOccurrence(notification);
    }

    return notification;
  }

  private buildDeduplicationKey(data: CreateOrUpdateNotificationInput): string {
    return createHash('md5')
      .update(
        [
          data.userId,
          data.type,
          data.referenceType ?? '<none>',
          data.referenceId ?? '<none>',
        ].join('\u001f'),
      )
      .digest('hex');
  }

  private async isInAppTypeEnabled(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    const typeEnabled =
      type === NotificationType.EXPIRY
        ? preferences.expiry
        : type === NotificationType.BUDGET
          ? preferences.budget
          : preferences.system;

    return (
      (preferences.inAppEnabled ||
        preferences.emailEnabled ||
        preferences.pushEnabled) &&
      typeEnabled
    );
  }

  private async resolveMissingNotifications(
    userId: string,
    type: NotificationType,
    activeReferences: Array<{
      referenceId: string;
      referenceType: string;
    }>,
  ): Promise<void> {
    const activeNotifications = await this.prisma.notification.findMany({
      where: { userId, type, resolvedAt: null },
      select: { id: true, referenceId: true, referenceType: true },
    });
    const activeKeys = new Set(
      activeReferences.map(
        ({ referenceId, referenceType }) => `${referenceType}:${referenceId}`,
      ),
    );
    const staleIds = activeNotifications
      .filter(
        ({ referenceId, referenceType }) =>
          !referenceId ||
          !referenceType ||
          !activeKeys.has(`${referenceType}:${referenceId}`),
      )
      .map(({ id }) => id);

    if (staleIds.length === 0) {
      return;
    }

    const now = new Date();
    await this.prisma.notification.updateMany({
      where: { id: { in: staleIds }, userId },
      data: { resolvedAt: now, isRead: true, updatedAt: now },
    });
    this.observability?.increment(
      'notifications.occurrences.resolved',
      staleIds.length,
    );
  }

  async purgeExpiredNotifications(retentionDays?: number): Promise<number> {
    const configured = Number(process.env.NOTIFICATION_RETENTION_DAYS);
    const days =
      retentionDays ??
      (Number.isFinite(configured) && configured >= 30 ? configured : 180);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.prisma.notification.deleteMany({
      where: {
        OR: [{ resolvedAt: { lt: cutoff } }, { dismissedAt: { lt: cutoff } }],
      },
    });
    this.observability?.increment(
      'notifications.retention.purged',
      result.count,
    );
    return result.count;
  }

  private async getUserTimeZone(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    const preferences = user?.preferences;
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
        this.observability?.increment('notifications.timezone.invalid');
      }
    }
    return 'Europe/Paris';
  }

  private daysUntil(date: Date | null, timeZone = 'Europe/Paris'): number {
    if (!date) {
      return 0;
    }

    const toDayNumber = (value: Date) => {
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

    return Math.round(
      (toDayNumber(date) - toDayNumber(new Date())) / 86_400_000,
    );
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || !Number.isFinite(limit)) {
      return 50;
    }

    return Math.min(Math.max(Math.trunc(limit), 1), 100);
  }

  private encodeCursor(lastOccurredAt: Date, id: string): string {
    return Buffer.from(
      JSON.stringify({ lastOccurredAt: lastOccurredAt.toISOString(), id }),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): {
    lastOccurredAt: Date;
    id: string;
  } {
    try {
      const value = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as { lastOccurredAt?: unknown; id?: unknown };
      const lastOccurredAt = new Date(String(value.lastOccurredAt));

      if (
        typeof value.id !== 'string' ||
        value.id.length === 0 ||
        Number.isNaN(lastOccurredAt.getTime())
      ) {
        throw new Error('Invalid cursor payload');
      }

      return { lastOccurredAt, id: value.id };
    } catch {
      throw new BadRequestException('Curseur de notifications invalide');
    }
  }
}
