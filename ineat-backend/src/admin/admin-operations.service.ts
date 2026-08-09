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

  async getInvoiceMetrics() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [events, invoices, failedInvoices, retriedInvoices] =
      await Promise.all([
        this.prisma.invoiceProcessingEvent.findMany({
          where: { startedAt: { gte: since }, durationMs: { not: null } },
          select: { stage: true, durationMs: true, status: true },
        }),
        this.prisma.invoice.findMany({
          where: { createdAt: { gte: since } },
          select: {
            status: true,
            processingAttempt: true,
            processingTime: true,
            _count: { select: { InvoiceItem: true } },
          },
        }),
        this.prisma.invoice.count({
          where: { createdAt: { gte: since }, status: 'FAILED' },
        }),
        this.prisma.invoice.count({
          where: { createdAt: { gte: since }, processingAttempt: { gt: 1 } },
        }),
      ]);
    const stages = new Map<string, number[]>();
    for (const event of events) {
      if (event.durationMs === null) continue;
      const values = stages.get(event.stage) ?? [];
      values.push(event.durationMs);
      stages.set(event.stage, values);
    }

    return {
      success: true,
      data: {
        periodDays: 30,
        invoices: invoices.length,
        failureRate:
          invoices.length > 0 ? failedInvoices / invoices.length : 0,
        retriedInvoices,
        averageItemCount:
          invoices.length > 0
            ? invoices.reduce(
                (sum, invoice) => sum + invoice._count.InvoiceItem,
                0,
              ) / invoices.length
            : 0,
        stages: [...stages.entries()].map(([stage, durations]) => ({
          stage,
          count: durations.length,
          p50Ms: this.percentile(durations, 0.5),
          p95Ms: this.percentile(durations, 0.95),
        })),
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
            processingStage: true,
            processingAttempt: true,
            processingTime: true,
            processingErrorCode: true,
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
          stage: item.processingStage,
          attempts: item.processingAttempt,
          durationMs: item.processingTime,
          modelVersion: null,
          errorCode: item.processingErrorCode,
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

  private percentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.ceil(percentile * sorted.length) - 1];
  }
}
