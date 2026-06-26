import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsageType } from '../../../prisma/generated/prisma/client';
import { AccessPolicyService, AccessPolicyUser } from './access-policy.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicyService: AccessPolicyService,
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

    await this.prisma.usageQuota.upsert({
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

    return this.getUsageState(user, usageType, now);
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
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
          ),
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
