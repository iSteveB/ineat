import { Injectable } from '@nestjs/common';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
} from '../../../prisma/generated/prisma/client';

export type EffectivePlan = 'FREE' | 'PREMIUM';

export interface AccessPolicyUser {
  role?: UserRole | string | null;
  subscriptionPlan?: SubscriptionPlan | string | null;
  subscriptionStatus?: SubscriptionStatus | string | null;
  trialStartedAt?: Date | string | null;
  trialEndsAt?: Date | string | null;
  currentPeriodStartedAt?: Date | string | null;
  currentPeriodEndsAt?: Date | string | null;
}

export interface AccessCapabilities {
  inventoryLimit: 50 | 500;
  canUseRecipes: boolean;
  canGenerateAiRecipes: boolean;
  aiRecipeGenerationRemaining: number;
  canImportDrive: boolean;
  driveImportsRemaining: number;
  canUseAutomaticBudgetSync: boolean;
  canAccessAdmin: boolean;
}

export interface AccessPolicy {
  effectivePlan: EffectivePlan;
  capabilities: AccessCapabilities;
}

@Injectable()
export class AccessPolicyService {
  getEffectivePlan(user: AccessPolicyUser, now = new Date()): EffectivePlan {
    if (this.isPremiumActive(user) || this.isTrialActive(user, now)) {
      return 'PREMIUM';
    }

    return 'FREE';
  }

  getCapabilities(user: AccessPolicyUser, now = new Date()): AccessCapabilities {
    const effectivePlan = this.getEffectivePlan(user, now);
    const isPremiumLike = effectivePlan === 'PREMIUM';
    const isTrial = this.isTrialActive(user, now);

    return {
      inventoryLimit: isPremiumLike ? 500 : 50,
      canUseRecipes: isPremiumLike,
      canGenerateAiRecipes: isPremiumLike,
      aiRecipeGenerationRemaining: this.getAiRecipeGenerationLimit(
        effectivePlan,
        isTrial,
      ),
      canImportDrive: isPremiumLike,
      driveImportsRemaining: this.getDriveImportLimit(effectivePlan, isTrial),
      canUseAutomaticBudgetSync: isPremiumLike,
      canAccessAdmin: user.role === 'ADMIN',
    };
  }

  getPolicy(user: AccessPolicyUser, now = new Date()): AccessPolicy {
    return {
      effectivePlan: this.getEffectivePlan(user, now),
      capabilities: this.getCapabilities(user, now),
    };
  }

  private isPremiumActive(user: AccessPolicyUser): boolean {
    return (
      user.subscriptionPlan === 'PREMIUM' &&
      user.subscriptionStatus === 'ACTIVE'
    );
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

  private getAiRecipeGenerationLimit(
    effectivePlan: EffectivePlan,
    isTrial: boolean,
  ): number {
    if (effectivePlan === 'FREE') {
      return 0;
    }

    return 5;
  }

  private getDriveImportLimit(
    effectivePlan: EffectivePlan,
    isTrial: boolean,
  ): number {
    if (effectivePlan === 'FREE') {
      return 0;
    }

    return isTrial ? 3 : 25;
  }

  private toDate(value?: Date | string | null): Date | null {
    if (!value) {
      return null;
    }

    return value instanceof Date ? value : new Date(value);
  }
}
