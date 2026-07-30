import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
}
