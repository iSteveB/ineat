import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Notification,
  NotificationType,
  ReceiptStatus,
} from '../../prisma/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
};

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(
    userId: string,
    options: ListNotificationsOptions = {},
  ): Promise<Notification[]> {
    await this.syncActionableNotifications(userId);

    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(options.includeRead ? {} : { isRead: false }),
      },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: this.normalizeLimit(options.limit),
    });
  }

  async countUnread(userId: string): Promise<number> {
    await this.syncActionableNotifications(userId);

    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
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

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead, updatedAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, updatedAt: new Date() },
    });

    return { count: result.count };
  }

  async createReceiptNotification(
    receiptId: string,
    status: ReceiptStatus,
    errorMessage?: string,
  ): Promise<void> {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id: receiptId },
      select: {
        id: true,
        userId: true,
        merchantName: true,
        totalAmount: true,
      },
    });

    if (!receipt) {
      return;
    }

    const isFailed = status === ReceiptStatus.FAILED;
    const merchant = receipt.merchantName ?? 'votre ticket';

    await this.createOrUpdateNotification({
      userId: receipt.userId,
      type: NotificationType.SYSTEM,
      title: isFailed ? 'Ticket en échec' : 'Ticket traité',
      message: isFailed
        ? `Le traitement de ${merchant} a échoué${errorMessage ? `: ${errorMessage}` : '.'}`
        : `${merchant} est prêt à être vérifié et ajouté à votre inventaire.`,
      referenceId: receipt.id,
      referenceType: 'receipt',
    });
  }

  private async syncActionableNotifications(userId: string): Promise<void> {
    await Promise.all([
      this.syncExpiryNotifications(userId),
      this.syncBudgetNotifications(userId),
    ]);
  }

  private async syncExpiryNotifications(userId: string): Promise<void> {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 5);
    limitDate.setHours(23, 59, 59, 999);

    const items = await this.prisma.inventoryItem.findMany({
      where: {
        userId,
        expiryDate: {
          not: null,
          lte: limitDate,
        },
      },
      include: { Product: true },
      orderBy: { expiryDate: 'asc' },
      take: 20,
    });

    await Promise.all(
      items.map((item) => {
        const days = this.daysUntil(item.expiryDate);
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
  }

  private async syncBudgetNotifications(userId: string): Promise<void> {
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
      return;
    }

    const spent = budget.Expense.reduce(
      (total, expense) => total + expense.amount,
      0,
    );
    const percentage = (spent / budget.amount) * 100;

    if (percentage < 75) {
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
  }

  private async createOrUpdateNotification(
    data: CreateOrUpdateNotificationInput,
  ): Promise<Notification> {
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: data.userId,
        type: data.type,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
      },
    });

    if (existing) {
      return this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          message: data.message,
          isRead: false,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        updatedAt: new Date(),
      },
    });
  }

  private daysUntil(date: Date | null): number {
    if (!date) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || !Number.isFinite(limit)) {
      return 50;
    }

    return Math.min(Math.max(Math.trunc(limit), 1), 100);
  }
}
