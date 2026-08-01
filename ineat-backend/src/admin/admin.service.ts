import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  SubscriptionPlan,
  UsageType,
  UserRole,
} from '../../prisma/generated/prisma/enums';
import { Prisma } from '../../prisma/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ObservabilityService } from '../observability/observability.service';
import { QueueMonitoringService } from '../jobs/queue-monitoring.service';
import { AdminActorContext, AdminAuditService } from './admin-audit.service';
import { AccessPolicyService } from '../auth/services/access-policy.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import {
  AdminDashboardPeriod,
  AdminDashboardQueryDto,
} from './dto/admin-dashboard-query.dto';
import { AdminQueueJobsQueryDto } from './dto/admin-operations-query.dto';
import { AdminAccountActionDto } from './dto/admin-mutation.dto';

const accountActions = {
  suspend: AccountStatus.SUSPENDED,
  activate: AccountStatus.ACTIVE,
  ban: AccountStatus.BANNED,
  rehabilitate: AccountStatus.ACTIVE,
  'schedule-deletion': AccountStatus.PENDING_DELETION,
} as const;

type AccountAction = keyof typeof accountActions | 'cancel-deletion';

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

  async getDashboard(query: AdminDashboardQueryDto) {
    const range = this.resolveDashboardRange(query);
    const previousRange = {
      from: new Date(
        range.from.getTime() - (range.to.getTime() - range.from.getTime()),
      ),
      to: range.from,
    };
    const [
      totalUsers,
      adminUsers,
      freeUsers,
      activeTrials,
      premiumUsers,
      expiredTrials,
      activeUsers,
      newUsers,
      previousNewUsers,
      trialStarts,
      conversions,
      cancellations,
      invoicesProcessed,
      failedInvoices,
      failedNotifications,
      failedWebhooks,
      aiGenerations,
      driveImports,
      queueSnapshot,
      trends,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.user.count({
        where: { subscriptionPlan: SubscriptionPlan.FREE },
      }),
      this.prisma.user.count({
        where: {
          subscriptionPlan: SubscriptionPlan.TRIAL,
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: { gt: new Date() },
        },
      }),
      this.prisma.user.count({
        where: {
          subscriptionPlan: SubscriptionPlan.PREMIUM,
          OR: [
            { subscriptionStatus: 'ACTIVE' },
            {
              subscriptionStatus: 'CANCELLED',
              currentPeriodEndsAt: { gt: new Date() },
            },
          ],
        },
      }),
      this.prisma.user.count({
        where: {
          subscriptionPlan: SubscriptionPlan.TRIAL,
          subscriptionStatus: 'EXPIRED',
        },
      }),
      this.prisma.user.count({
        where: {
          sessions: {
            some: { updatedAt: { gte: range.from, lt: range.to } },
          },
        },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: range.from, lt: range.to } },
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: previousRange.from, lt: previousRange.to },
        },
      }),
      this.prisma.user.count({
        where: { trialStartedAt: { gte: range.from, lt: range.to } },
      }),
      this.prisma.user.count({
        where: {
          subscriptionPlan: SubscriptionPlan.PREMIUM,
          trialUsedAt: { not: null },
          currentPeriodStartedAt: { gte: range.from, lt: range.to },
        },
      }),
      this.prisma.user.count({
        where: {
          subscriptionCancelledAt: { gte: range.from, lt: range.to },
        },
      }),
      this.prisma.invoice.count({
        where: {
          status: { in: ['COMPLETED', 'VALIDATED'] },
          updatedAt: { gte: range.from, lt: range.to },
        },
      }),
      this.prisma.invoice.count({
        where: {
          status: 'FAILED',
          updatedAt: { gte: range.from, lt: range.to },
        },
      }),
      this.prisma.notificationDelivery.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: range.from, lt: range.to },
        },
      }),
      this.prisma.stripeWebhookEvent.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: range.from, lt: range.to },
        },
      }),
      this.prisma.usageEvent.count({
        where: {
          usageType: 'AI_RECIPE_GENERATION',
          occurredAt: { gte: range.from, lt: range.to },
        },
      }),
      this.prisma.usageEvent.count({
        where: {
          usageType: 'DRIVE_IMPORT',
          occurredAt: { gte: range.from, lt: range.to },
        },
      }),
      this.queueMonitoringService.getSnapshot(),
      this.getDashboardTrends(range.from, range.to),
    ]);

    const failedJobs = queueSnapshot.queues.reduce(
      (sum, queue) => sum + (queue.counts.failed ?? 0),
      0,
    );

    return {
      success: true,
      data: {
        period: {
          key: query.period ?? '30d',
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        },
        users: {
          total: totalUsers,
          admins: adminUsers,
          active: activeUsers,
          new: newUsers,
          growthRate: this.percentageChange(newUsers, previousNewUsers),
          free: freeUsers,
          trial: activeTrials,
          premium: premiumUsers,
          expiredTrials,
        },
        subscriptions: {
          free: freeUsers,
          activeTrials,
          expiredTrials,
          premium: premiumUsers,
          trialStarts,
          conversions,
          conversionRate:
            trialStarts === 0
              ? 0
              : Math.round((conversions / trialStarts) * 1000) / 10,
          cancellations,
        },
        usage: {
          aiGenerations,
          driveImports,
          invoicesProcessed,
          historyStatus: 'TRACKED_FROM_USAGE_EVENTS',
        },
        operations: {
          failedJobs,
          failedWebhooks,
          failedNotifications,
          failedInvoices,
        },
        trends,
        attention: [
          { type: 'FAILED_JOBS', count: failedJobs },
          { type: 'FAILED_WEBHOOKS', count: failedWebhooks },
          { type: 'FAILED_NOTIFICATIONS', count: failedNotifications },
          { type: 'FAILED_INVOICES', count: failedInvoices },
        ].filter((item) => item.count > 0),
        observability: this.observabilityService.getSnapshot(),
      },
    };
  }

  private resolveDashboardRange(query: AdminDashboardQueryDto) {
    const period = query.period ?? '30d';
    const now = new Date();
    if (period !== 'custom') {
      const days = this.periodDays(period);
      return {
        from: new Date(now.getTime() - days * 24 * 60 * 60_000),
        to: now,
      };
    }
    if (!query.from || !query.to) {
      throw new BadRequestException(
        'Les dates from et to sont requises pour une période personnalisée',
      );
    }
    const from = new Date(`${query.from}T00:00:00.000Z`);
    const to = new Date(`${query.to}T00:00:00.000Z`);
    to.setUTCDate(to.getUTCDate() + 1);
    const durationDays = (to.getTime() - from.getTime()) / (24 * 60 * 60_000);
    if (durationDays <= 0 || durationDays > 366) {
      throw new BadRequestException(
        'La période personnalisée doit contenir entre 1 et 366 jours',
      );
    }
    return { from, to };
  }

  private periodDays(period: Exclude<AdminDashboardPeriod, 'custom'>) {
    return Number.parseInt(period, 10);
  }

  private percentageChange(current: number, previous: number) {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private async getDashboardTrends(from: Date, to: Date) {
    type CountRow = { date: Date | string; count: number | bigint };
    type SubscriptionRow = CountRow & {
      trials: number | bigint;
      conversions: number | bigint;
    };
    type OperationRow = CountRow & {
      successes: number | bigint;
      failures: number | bigint;
    };
    const [registrations, subscriptions, operations] = await Promise.all([
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', "createdAt")::date AS date, COUNT(*)::int AS count
        FROM "User"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        GROUP BY 1 ORDER BY 1
      `),
      this.prisma.$queryRaw<SubscriptionRow[]>(Prisma.sql`
        SELECT day AS date,
          SUM(trials)::int AS trials,
          SUM(conversions)::int AS conversions,
          SUM(trials + conversions)::int AS count
        FROM (
          SELECT DATE_TRUNC('day', "trialStartedAt")::date AS day, 1 AS trials, 0 AS conversions
          FROM "User"
          WHERE "trialStartedAt" >= ${from} AND "trialStartedAt" < ${to}
          UNION ALL
          SELECT DATE_TRUNC('day', "currentPeriodStartedAt")::date AS day, 0 AS trials, 1 AS conversions
          FROM "User"
          WHERE "subscriptionPlan"::text = 'PREMIUM'
            AND "trialUsedAt" IS NOT NULL
            AND "currentPeriodStartedAt" >= ${from} AND "currentPeriodStartedAt" < ${to}
        ) source
        GROUP BY day ORDER BY day
      `),
      this.prisma.$queryRaw<OperationRow[]>(Prisma.sql`
        SELECT day AS date,
          SUM(successes)::int AS successes,
          SUM(failures)::int AS failures,
          SUM(successes + failures)::int AS count
        FROM (
          SELECT DATE_TRUNC('day', "updatedAt")::date AS day,
            CASE WHEN "status"::text IN ('COMPLETED', 'VALIDATED') THEN 1 ELSE 0 END AS successes,
            CASE WHEN "status"::text = 'FAILED' THEN 1 ELSE 0 END AS failures
          FROM "Invoice"
          WHERE "updatedAt" >= ${from} AND "updatedAt" < ${to}
          UNION ALL
          SELECT DATE_TRUNC('day', "createdAt")::date AS day, 0 AS successes, 1 AS failures
          FROM "NotificationDelivery"
          WHERE "status"::text = 'FAILED' AND "createdAt" >= ${from} AND "createdAt" < ${to}
          UNION ALL
          SELECT DATE_TRUNC('day', "createdAt")::date AS day, 0 AS successes, 1 AS failures
          FROM "StripeWebhookEvent"
          WHERE "status" = 'FAILED' AND "createdAt" >= ${from} AND "createdAt" < ${to}
        ) source
        GROUP BY day ORDER BY day
      `),
    ]);
    return {
      registrations: registrations.map((row) => this.countPoint(row)),
      subscriptions: subscriptions.map((row) => ({
        date: this.dateKey(row.date),
        trials: Number(row.trials),
        conversions: Number(row.conversions),
      })),
      operations: operations.map((row) => ({
        date: this.dateKey(row.date),
        successes: Number(row.successes),
        failures: Number(row.failures),
      })),
    };
  }

  private countPoint(row: { date: Date | string; count: number | bigint }) {
    return { date: this.dateKey(row.date), value: Number(row.count) };
  }

  private dateKey(value: Date | string) {
    return (value instanceof Date ? value : new Date(value))
      .toISOString()
      .slice(0, 10);
  }

  async listUsers(query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      role: query.role,
      accountStatus: query.accountStatus,
      subscriptionPlan: query.plan,
      subscriptionStatus: query.status,
      createdAt:
        query.createdFrom || query.createdTo
          ? {
              ...(query.createdFrom
                ? { gte: new Date(query.createdFrom) }
                : {}),
              ...(query.createdTo ? { lt: new Date(query.createdTo) } : {}),
            }
          : undefined,
      sessions:
        query.activeFrom || query.activeTo
          ? {
              some: {
                updatedAt: {
                  ...(query.activeFrom
                    ? { gte: new Date(query.activeFrom) }
                    : {}),
                  ...(query.activeTo ? { lt: new Date(query.activeTo) } : {}),
                },
              },
            }
          : undefined,
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

  async updateAccountStatus(
    id: string,
    rawAction: string,
    input: AdminAccountActionDto,
    actor: AdminActorContext,
  ) {
    if (!(rawAction in accountActions) && rawAction !== 'cancel-deletion') {
      throw new BadRequestException('Action de compte invalide');
    }
    const action = rawAction as AccountAction;
    const now = new Date();
    const suspendedUntil = input.suspendedUntil
      ? new Date(input.suspendedUntil)
      : null;
    if (
      action === 'suspend' &&
      suspendedUntil &&
      suspendedUntil.getTime() <= now.getTime()
    ) {
      throw new BadRequestException('La fin de suspension doit être future');
    }

    const user = await this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.user.findUnique({ where: { id } });
      if (!previous) throw new NotFoundException('Utilisateur non trouvé');

      const neutralizesAccount = [
        'suspend',
        'ban',
        'schedule-deletion',
      ].includes(action);
      if (neutralizesAccount && id === actor.userId) {
        throw new BadRequestException(
          'Un administrateur ne peut pas neutraliser son propre compte',
        );
      }
      if (neutralizesAccount && previous.role === UserRole.ADMIN) {
        const otherActiveAdmins = await transaction.user.count({
          where: {
            id: { not: id },
            role: UserRole.ADMIN,
            accountStatus: AccountStatus.ACTIVE,
          },
        });
        if (otherActiveAdmins === 0) {
          throw new BadRequestException(
            'Le dernier administrateur actif ne peut pas être neutralisé',
          );
        }
      }

      const allowed: Record<AccountAction, AccountStatus[]> = {
        suspend: [AccountStatus.ACTIVE, AccountStatus.SUSPENDED],
        activate: [AccountStatus.SUSPENDED],
        ban: [AccountStatus.ACTIVE, AccountStatus.SUSPENDED],
        rehabilitate: [AccountStatus.BANNED],
        'schedule-deletion': [
          AccountStatus.ACTIVE,
          AccountStatus.SUSPENDED,
          AccountStatus.BANNED,
        ],
        'cancel-deletion': [AccountStatus.PENDING_DELETION],
      };
      if (!allowed[action].includes(previous.accountStatus)) {
        throw new BadRequestException(
          `Transition impossible depuis ${previous.accountStatus}`,
        );
      }

      const targetStatus =
        action === 'cancel-deletion'
          ? previous.statusBeforeDeletion || AccountStatus.ACTIVE
          : accountActions[action as keyof typeof accountActions];
      const updated = await transaction.user.update({
        where: { id },
        data: {
          accountStatus: targetStatus,
          accountStatusChangedAt: now,
          moderationReason: input.reason.trim(),
          suspendedUntil: action === 'suspend' ? suspendedUntil : null,
          deletionScheduledAt:
            action === 'schedule-deletion'
              ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
              : action === 'cancel-deletion'
                ? null
                : previous.deletionScheduledAt,
          statusBeforeDeletion:
            action === 'schedule-deletion'
              ? previous.accountStatus
              : action === 'cancel-deletion'
                ? null
                : previous.statusBeforeDeletion,
        },
        include: adminUserInclude,
      });
      if (neutralizesAccount) {
        await transaction.session.deleteMany({ where: { userId: id } });
      }
      await this.adminAuditService.record(
        {
          ...actor,
          action: `USER_ACCOUNT_${action.toUpperCase().replace(/-/g, '_')}`,
          resourceType: 'USER',
          resourceId: id,
          previousValue: {
            accountStatus: previous.accountStatus,
            suspendedUntil: previous.suspendedUntil,
            deletionScheduledAt: previous.deletionScheduledAt,
          },
          newValue: {
            accountStatus: targetStatus,
            suspendedUntil: updated.suspendedUntil,
            deletionScheduledAt: updated.deletionScheduledAt,
          },
          reason: input.reason.trim(),
        },
        transaction,
      );
      return updated;
    });

    return { success: true, data: this.toAdminUser(user) };
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

  listQueueJobs(queueName: string, query: AdminQueueJobsQueryDto) {
    return this.queueMonitoringService.listJobs(
      queueName,
      query.state,
      query.page ?? 1,
      query.pageSize ?? 25,
    );
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
      accountStatus: user.accountStatus,
      accountStatusChangedAt:
        user.accountStatusChangedAt?.toISOString() ?? null,
      suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
      moderationReason: user.moderationReason,
      deletionScheduledAt: user.deletionScheduledAt?.toISOString() ?? null,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      trialStartedAt: user.trialStartedAt?.toISOString() ?? null,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      currentPeriodStartedAt:
        user.currentPeriodStartedAt?.toISOString() ?? null,
      currentPeriodEndsAt: user.currentPeriodEndsAt?.toISOString() ?? null,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      billingInterval: user.billingInterval,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastActiveAt:
        user.sessions[0]?.updatedAt.toISOString() ??
        user.createdAt.toISOString(),
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
