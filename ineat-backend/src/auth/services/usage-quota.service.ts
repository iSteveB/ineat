import {
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsageType } from '../../../prisma/generated/prisma/client';
import { AccessPolicyService, AccessPolicyUser } from './access-policy.service';
import { EmailService } from '../../email/email.service';

export interface UsageQuotaState {
  usageType: UsageType;
  limit: number;
  usedCount: number;
  remaining: number;
  periodStart: Date | null;
  periodEnd: Date | null;
}

@Injectable()
export class UsageQuotaService {
  private readonly logger = new Logger(UsageQuotaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicyService: AccessPolicyService,
    @Optional() private readonly email?: EmailService,
  ) {}

  async getUsageState(
    user: AccessPolicyUser & { id: string },
    usageType: UsageType,
    now = new Date(),
  ): Promise<UsageQuotaState> {
    const quota = this.getQuotaDefinition(user, usageType, now);

    if (quota.limit === 0 || !quota.periodStart || !quota.periodEnd) {
      return {
        usageType,
        limit: quota.limit,
        usedCount: 0,
        remaining: 0,
        periodStart: quota.periodStart,
        periodEnd: quota.periodEnd,
      };
    }

    const usage = await this.prisma.usageQuota.findUnique({
      where: {
        userId_usageType_periodStart_periodEnd: {
          userId: user.id,
          usageType,
          periodStart: quota.periodStart,
          periodEnd: quota.periodEnd,
        },
      },
    });

    const usedCount = usage?.usedCount ?? 0;

    return {
      usageType,
      limit: quota.limit,
      usedCount,
      remaining: Math.max(quota.limit - usedCount, 0),
      periodStart: quota.periodStart,
      periodEnd: quota.periodEnd,
    };
  }

  async assertCanConsume(
    user: AccessPolicyUser & { id: string },
    usageType: UsageType,
    now = new Date(),
  ): Promise<UsageQuotaState> {
    const state = await this.getUsageState(user, usageType, now);

    if (state.remaining <= 0) {
      throw new ForbiddenException('Quota atteint pour cette fonctionnalité');
    }

    return state;
  }

  async recordSuccessfulUsage(
    user: AccessPolicyUser & { id: string },
    usageType: UsageType,
    now = new Date(),
  ): Promise<UsageQuotaState> {
    const state = await this.assertCanConsume(user, usageType, now);

    const persisted = await this.prisma.$transaction(async (transaction) => {
      const quota = await transaction.usageQuota.upsert({
        where: {
          userId_usageType_periodStart_periodEnd: {
            userId: user.id,
            usageType,
            periodStart: state.periodStart!,
            periodEnd: state.periodEnd!,
          },
        },
        create: {
          id: randomUUID(),
          userId: user.id,
          usageType,
          periodStart: state.periodStart!,
          periodEnd: state.periodEnd!,
          usedCount: 1,
          limit: state.limit,
          updatedAt: now,
        },
        update: {
          usedCount: {
            increment: 1,
          },
          limit: state.limit,
          updatedAt: now,
        },
      });
      await transaction.usageEvent.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          usageType,
          occurredAt: now,
        },
      });
      return quota;
    });

    const result = await this.getUsageState(user, usageType, now);
    if (persisted?.id) {
      await this.sendQuotaEmailIfNeeded(
        user.id,
        persisted.id,
        usageType,
        result,
        Boolean(persisted.warningEmailSentAt),
        Boolean(persisted.reachedEmailSentAt),
      );
    }
    return result;
  }

  private async sendQuotaEmailIfNeeded(
    userId: string,
    quotaId: string,
    usageType: UsageType,
    state: UsageQuotaState,
    warningSent: boolean,
    reachedSent: boolean,
  ): Promise<void> {
    if (!this.email || !state.periodEnd || state.limit <= 0) return;
    const reached = state.usedCount >= state.limit;
    const warning = !reached && state.usedCount >= Math.ceil(state.limit * 0.8);
    if (
      (!reached && !warning) ||
      (reached && reachedSent) ||
      (warning && warningSent)
    )
      return;

    const recipient = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    if (!recipient) return;
    try {
      await this.email.sendQuota({
        to: recipient.email,
        firstName: recipient.firstName,
        userId,
        quotaId,
        reached,
        usageLabel:
          usageType === 'AI_RECIPE_GENERATION'
            ? 'générations de recettes IA'
            : 'imports de factures',
        usedCount: state.usedCount,
        limit: state.limit,
        resetsAt: state.periodEnd,
        subscriptionUrl: `${(process.env.FRONTEND_URL || 'https://ineat.store').replace(/\/$/, '')}/app/subscription`,
      });
      await this.prisma.usageQuota.update({
        where: { id: quotaId },
        data: reached
          ? { reachedEmailSentAt: new Date() }
          : { warningEmailSentAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Quota email failed for quota ${quotaId}`, error);
    }
  }

  getQuotaDefinition(
    user: AccessPolicyUser,
    usageType: UsageType,
    now = new Date(),
  ): Omit<UsageQuotaState, 'usageType' | 'usedCount' | 'remaining'> {
    const effectivePlan = this.accessPolicyService.getEffectivePlan(user, now);
    const isTrial = this.isTrialActive(user, now);

    if (effectivePlan === 'FREE') {
      return {
        limit: 0,
        periodStart: null,
        periodEnd: null,
      };
    }

    if (usageType === 'AI_RECIPE_GENERATION') {
      return {
        limit: 5,
        periodStart: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        ),
        periodEnd: new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
          ),
        ),
      };
    }

    if (isTrial) {
      return {
        limit: 3,
        periodStart: this.toDate(user.trialStartedAt) ?? now,
        periodEnd: this.toDate(user.trialEndsAt)!,
      };
    }

    const period = this.getMonthlyPeriod(user, now);

    return {
      limit: 25,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    };
  }

  private getMonthlyPeriod(
    user: AccessPolicyUser,
    now: Date,
  ): { periodStart: Date; periodEnd: Date } {
    const currentPeriodStartedAt = this.toDate(user.currentPeriodStartedAt);
    const currentPeriodEndsAt = this.toDate(user.currentPeriodEndsAt);

    if (currentPeriodStartedAt && currentPeriodEndsAt) {
      return {
        periodStart: currentPeriodStartedAt,
        periodEnd: currentPeriodEndsAt,
      };
    }

    return {
      periodStart: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      ),
      periodEnd: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      ),
    };
  }

  private isTrialActive(user: AccessPolicyUser, now: Date): boolean {
    const trialEndsAt = this.toDate(user.trialEndsAt);

    return (
      user.subscriptionPlan === 'TRIAL' &&
      user.subscriptionStatus === 'ACTIVE' &&
      !!trialEndsAt &&
      trialEndsAt.getTime() > now.getTime()
    );
  }

  private toDate(value?: Date | string | null): Date | null {
    if (!value) {
      return null;
    }

    return value instanceof Date ? value : new Date(value);
  }
}
