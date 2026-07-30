import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';

export type AdminActorContext = {
  userId: string;
  sessionId?: string;
  ipAddress?: string;
};

export type AdminAuditInput = AdminActorContext & {
  action: string;
  resourceType: string;
  resourceId: string;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  reason: string;
};

type AuditClient = Pick<PrismaService, 'adminAuditLog'>;

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: AdminAuditInput, client: AuditClient = this.prisma) {
    return client.adminAuditLog.create({
      data: {
        id: randomUUID(),
        adminUserId: input.userId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        previousValue: input.previousValue,
        newValue: input.newValue,
        reason: input.reason.trim(),
        ipAddress: input.ipAddress,
        sessionId: input.sessionId,
      },
    });
  }

  async list(query: AdminAuditQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.AdminAuditLogWhereInput = {
      adminUserId: query.adminUserId,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      createdAt:
        query.from || query.to
          ? {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            }
          : undefined,
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: query.order ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          AdminUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    return {
      success: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          action: item.action,
          resourceType: item.resourceType,
          resourceId: item.resourceId,
          previousValue: item.previousValue,
          newValue: item.newValue,
          reason: item.reason,
          ipAddress: item.ipAddress,
          sessionId: item.sessionId,
          createdAt: item.createdAt.toISOString(),
          admin: item.AdminUser,
        })),
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
        },
      },
    };
  }
}
