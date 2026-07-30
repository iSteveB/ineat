import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminIncidentType,
  AdminIncidentsQueryDto,
} from './dto/admin-operations-query.dto';

@Injectable()
export class AdminOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listIncidents(query: AdminIncidentsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;
    const result = await this.incidents(query.type, skip, pageSize);
    return {
      success: true,
      data: {
        type: query.type,
        items: result.items,
        pagination: {
          page,
          pageSize,
          totalItems: result.totalItems,
          totalPages: Math.max(1, Math.ceil(result.totalItems / pageSize)),
        },
      },
    };
  }

  private async incidents(type: AdminIncidentType, skip: number, take: number) {
    if (type === AdminIncidentType.INVOICE) {
      const where = { status: 'FAILED' as const };
      const [items, totalItems] = await this.prisma.$transaction([
        this.prisma.invoice.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            status: true,
            analysisProvider: true,
            errorMessage: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.invoice.count({ where }),
      ]);
      return {
        totalItems,
        items: items.map((item) => ({
          id: item.id,
          category: 'Analyse de facture',
          status: item.status,
          subtype: item.analysisProvider,
          error: this.safeError(item.errorMessage),
          occurredAt: item.updatedAt.toISOString(),
          createdAt: item.createdAt.toISOString(),
        })),
      };
    }
    if (type === AdminIncidentType.NOTIFICATION) {
      const where = { status: 'FAILED' as const };
      const [items, totalItems] = await this.prisma.$transaction([
        this.prisma.notificationDelivery.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            status: true,
            channel: true,
            attemptCount: true,
            errorMessage: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.notificationDelivery.count({ where }),
      ]);
      return {
        totalItems,
        items: items.map((item) => ({
          id: item.id,
          category: 'Notification',
          status: item.status,
          subtype: item.channel,
          attempts: item.attemptCount,
          error: this.safeError(item.errorMessage),
          occurredAt: item.updatedAt.toISOString(),
          createdAt: item.createdAt.toISOString(),
        })),
      };
    }
    if (type === AdminIncidentType.STRIPE_WEBHOOK) {
      const where = { status: 'FAILED' };
      const [items, totalItems] = await this.prisma.$transaction([
        this.prisma.stripeWebhookEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            type: true,
            status: true,
            errorMessage: true,
            createdAt: true,
            processedAt: true,
          },
        }),
        this.prisma.stripeWebhookEvent.count({ where }),
      ]);
      return {
        totalItems,
        items: items.map((item) => ({
          id: item.id,
          category: 'Webhook Stripe',
          status: item.status,
          subtype: item.type,
          error: this.safeError(item.errorMessage),
          occurredAt: item.createdAt.toISOString(),
          processedAt: item.processedAt?.toISOString() ?? null,
        })),
      };
    }
    const where = {
      type: { in: ['email.bounced', 'email.complained'] },
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.resendWebhookEvent.findMany({
        where,
        orderBy: { eventAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          type: true,
          emailType: true,
          eventAt: true,
          processedAt: true,
        },
      }),
      this.prisma.resendWebhookEvent.count({ where }),
    ]);
    return {
      totalItems,
      items: items.map((item) => ({
        id: item.id,
        category: 'Webhook Resend',
        status: 'PROCESSED',
        subtype: item.type,
        emailType: item.emailType,
        error:
          item.type === 'email.bounced'
            ? 'E-mail rejeté'
            : 'Plainte destinataire',
        occurredAt: item.eventAt.toISOString(),
        processedAt: item.processedAt.toISOString(),
      })),
    };
  }

  private safeError(value: string | null): string {
    if (!value) return 'Erreur non renseignée';
    return value
      .replace(/(Bearer\s+)[^\s]+/gi, '$1[redacted]')
      .replace(/\bsk_(?:live|test)_[A-Za-z0-9]+\b/g, '[redacted]')
      .replace(/[\r\n\t]+/g, ' ')
      .slice(0, 300);
  }
}
