import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SubscriptionPlan,
  UsageType,
  UserRole,
} from '../../prisma/generated/prisma/enums';
import { Prisma } from '../../prisma/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ObservabilityService } from '../observability/observability.service';
import { QueueMonitoringService } from '../jobs/queue-monitoring.service';
import {
  AdminActorContext,
  AdminAuditService,
} from './admin-audit.service';
import { AccessPolicyService } from '../auth/services/access-policy.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

const adminUserInclude = {
  UsageQuota: {
    orderBy: { periodEnd: 'desc' as const },
    take: 4,
  },
  sessions: {
    orderBy: { updatedAt: 'desc' as const },
    take: 1,
    select: { updatedAt: true },
  },
  _count: {
    select: {
      InventoryItem: true,
      Invoice: true,
      Recipe: true,
    },
  },
} satisfies Prisma.UserInclude;

type AdminUserWithUsage = Prisma.UserGetPayload<{
  include: typeof adminUserInclude;
}>;

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private observabilityService: ObservabilityService,
    private queueMonitoringService: QueueMonitoringService,
    private adminAuditService: AdminAuditService,
    private accessPolicyService: AccessPolicyService,
  ) {}

  async getDashboard() {
    const [
      totalUsers,
      adminUsers,
      freeUsers,
      trialUsers,
      premiumUsers,
      expiredTrials,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.user.count({
        where: { subscriptionPlan: SubscriptionPlan.FREE },
      }),
      this.prisma.user.count({
        where: { subscriptionPlan: SubscriptionPlan.TRIAL },
      }),
      this.prisma.user.count({
        where: { subscriptionPlan: SubscriptionPlan.PREMIUM },
      }),
      this.prisma.user.count({
        where: {
          subscriptionPlan: SubscriptionPlan.TRIAL,
          subscriptionStatus: 'EXPIRED',
        },
      }),
    ]);

    return {
      success: true,
      data: {
        users: {
          total: totalUsers,
          admins: adminUsers,
          free: freeUsers,
          trial: trialUsers,
          premium: premiumUsers,
          expiredTrials,
        },
        observability: this.observabilityService.getSnapshot(),
      },
    };
  }

  async listUsers(query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      role: query.role,
      subscriptionPlan: query.plan,
      subscriptionStatus: query.status,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              {
                name: { contains: search, mode: 'insensitive' },
              },
            ],
          }
        : {}),
    };
    const [users, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { [query.sort ?? 'createdAt']: query.order ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: adminUserInclude,
      }),
      this.prisma.user.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return {
      success: true,
      data: {
        items: users.map((user) => this.toAdminUser(user)),
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
        },
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.findUserWithUsage(id);

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return {
      success: true,
      data: this.toAdminUser(user),
    };
  }

  async updateUserRole(
    id: string,
    role: UserRole,
    reason: string,
    actor: AdminActorContext,
  ) {
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Rôle invalide');
    }

    const user = await this.prisma.$transaction(async (transaction) => {
      const previousUser = await transaction.user.findUnique({
        where: { id },
      });
      if (!previousUser) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      if (previousUser.role === UserRole.ADMIN && role === UserRole.USER) {
        const otherAdminCount = await transaction.user.count({
          where: {
            role: UserRole.ADMIN,
            id: { not: id },
          },
        });
        if (otherAdminCount === 0) {
          throw new BadRequestException(
            'Le dernier administrateur ne peut pas être rétrogradé',
          );
        }
      }

      const updatedUser = await transaction.user.update({
        where: { id },
        data: { role },
        include: adminUserInclude,
      });
      await this.adminAuditService.record(
        {
          ...actor,
          action: 'USER_ROLE_UPDATED',
          resourceType: 'USER',
          resourceId: id,
          previousValue: { role: previousUser.role },
          newValue: { role },
          reason,
        },
        transaction,
      );
      return updatedUser;
    });

    return {
      success: true,
      data: this.toAdminUser(user),
    };
  }

  async updateSubscriptionPlan(
    id: string,
    subscriptionPlan: SubscriptionPlan,
    reason: string,
    actor: AdminActorContext,
  ) {
    if (!Object.values(SubscriptionPlan).includes(subscriptionPlan)) {
      throw new BadRequestException('Plan invalide');
    }

    const user = await this.prisma.$transaction(async (transaction) => {
      const previousUser = await transaction.user.findUnique({
        where: { id },
      });
      if (!previousUser) {
        throw new NotFoundException('Utilisateur non trouvé');
      }
      const updatedUser = await transaction.user.update({
        where: { id },
        data: { subscriptionPlan },
        include: adminUserInclude,
      });
      await this.adminAuditService.record(
        {
          ...actor,
          action: 'USER_SUBSCRIPTION_PLAN_UPDATED',
          resourceType: 'USER',
          resourceId: id,
          previousValue: {
            subscriptionPlan: previousUser.subscriptionPlan,
          },
          newValue: { subscriptionPlan },
          reason,
        },
        transaction,
      );
      return updatedUser;
    });

    return {
      success: true,
      data: this.toAdminUser(user),
    };
  }

  getObservability() {
    return {
      success: true,
      data: this.observabilityService.getSnapshot(),
    };
  }

  async getQueues() {
    return {
      success: true,
      data: await this.queueMonitoringService.getSnapshot(),
    };
  }

  async retryQueueJob(
    queueName: string,
    jobId: string,
    reason: string,
    actor: AdminActorContext,
  ) {
    const result = await this.queueMonitoringService.retryFailedJob(
      queueName,
      jobId,
    );
    await this.adminAuditService.record({
      ...actor,
      action: 'QUEUE_JOB_RETRIED',
      resourceType: 'QUEUE_JOB',
      resourceId: `${queueName}:${jobId}`,
      newValue: {
        queueName: result.queueName,
        jobId: result.jobId,
        state: result.state,
      },
      reason,
    });
    return {
      success: true,
      data: result,
    };
  }

  private findUserWithUsage(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: adminUserInclude,
    });
  }

  private toAdminUser(user: AdminUserWithUsage) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      trialStartedAt: user.trialStartedAt?.toISOString() ?? null,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      currentPeriodStartedAt:
        user.currentPeriodStartedAt?.toISOString() ?? null,
      currentPeriodEndsAt: user.currentPeriodEndsAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastActiveAt:
        user.sessions[0]?.updatedAt.toISOString() ?? user.createdAt.toISOString(),
      effectivePlan: this.accessPolicyService.getEffectivePlan(user),
      counts: {
        inventoryItems: user._count.InventoryItem,
        invoices: user._count.Invoice,
        recipes: user._count.Recipe,
      },
      quotas: user.UsageQuota.map((quota) => ({
        id: quota.id,
        usageType: quota.usageType as UsageType,
        usedCount: quota.usedCount,
        limit: quota.limit,
        periodStart: quota.periodStart.toISOString(),
        periodEnd: quota.periodEnd.toISOString(),
      })),
    };
  }
}
