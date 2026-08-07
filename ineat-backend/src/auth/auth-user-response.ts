import { SafeUserDto } from './dto/auth.dto';
import {
  AccessPolicyService,
  AccessPolicy,
} from './services/access-policy.service';
import { UsageQuotaService } from './services/usage-quota.service';

type SafeUserResponseSource = Omit<SafeUserDto, 'preferences'> & {
  preferences?: unknown;
};

const normalizePreferences = (
  preferences: unknown,
): Record<string, unknown> => {
  if (
    preferences &&
    typeof preferences === 'object' &&
    !Array.isArray(preferences)
  ) {
    return preferences as Record<string, unknown>;
  }

  if (typeof preferences === 'string') {
    try {
      const parsed: unknown = JSON.parse(preferences);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Les anciens comptes peuvent contenir une chaîne non JSON.
    }
  }

  return {};
};

export const toLegacySubscription = (user: {
  subscriptionPlan?: string | null;
}): 'FREE' | 'TRIAL' | 'PREMIUM' => {
  return user.subscriptionPlan === 'TRIAL' ||
    user.subscriptionPlan === 'PREMIUM'
    ? user.subscriptionPlan
    : 'FREE';
};

export const toSafeUserResponse = (
  user: SafeUserResponseSource,
  accessPolicyService?: AccessPolicyService,
) => {
  const policy: AccessPolicy = accessPolicyService?.getPolicy(user) ?? {
    effectivePlan: 'FREE',
    capabilities: {
      inventoryLimit: 50,
      canUseRecipes: false,
      canGenerateAiRecipes: false,
      aiRecipeGenerationRemaining: 0,
      canImportDrive: false,
      driveImportsRemaining: 0,
      canUseAutomaticBudgetSync: false,
      canAccessAdmin: user.role === 'ADMIN',
    },
  };

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    defaultServings: user.defaultServings,
    primaryGoal: user.primaryGoal,
    profileOnboardingCompletedAt:
      user.profileOnboardingCompletedAt?.toISOString() ?? null,
    role: user.role || 'USER',
    subscriptionPlan: user.subscriptionPlan || 'FREE',
    subscriptionStatus: user.subscriptionStatus || 'ACTIVE',
    trialStartedAt: user.trialStartedAt?.toISOString() ?? null,
    trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    trialUsedAt: user.trialUsedAt?.toISOString() ?? null,
    currentPeriodStartedAt: user.currentPeriodStartedAt?.toISOString() ?? null,
    currentPeriodEndsAt: user.currentPeriodEndsAt?.toISOString() ?? null,
    billingInterval: user.billingInterval ?? null,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd ?? false,
    subscriptionCancelledAt:
      user.subscriptionCancelledAt?.toISOString() ?? null,
    effectivePlan: policy.effectivePlan,
    capabilities: policy.capabilities,
    subscription: toLegacySubscription(user),
    preferences: normalizePreferences(user.preferences),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
};

export const toSafeUserResponseWithUsage = async (
  user: SafeUserDto,
  accessPolicyService: AccessPolicyService,
  usageQuotaService: UsageQuotaService,
) => {
  const response = toSafeUserResponse(user, accessPolicyService);
  const [aiUsage, driveUsage] = await Promise.all([
    usageQuotaService.getUsageState(
      user as SafeUserDto & { id: string },
      'AI_RECIPE_GENERATION',
    ),
    usageQuotaService.getUsageState(
      user as SafeUserDto & { id: string },
      'DRIVE_IMPORT',
    ),
  ]);

  return {
    ...response,
    capabilities: {
      ...response.capabilities,
      aiRecipeGenerationRemaining: aiUsage.remaining,
      driveImportsRemaining: driveUsage.remaining,
    },
  };
};
