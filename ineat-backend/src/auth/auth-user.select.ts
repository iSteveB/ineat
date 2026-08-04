import { Prisma } from '../../prisma/generated/prisma/client';

export const authUserSelect = {
  id: true,
  email: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  defaultServings: true,
  primaryGoal: true,
  profileOnboardingCompletedAt: true,
  preferences: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  accountStatus: true,
  suspendedUntil: true,
  subscriptionPlan: true,
  subscriptionStatus: true,
  trialStartedAt: true,
  trialEndsAt: true,
  trialUsedAt: true,
  currentPeriodStartedAt: true,
  currentPeriodEndsAt: true,
  billingInterval: true,
  cancelAtPeriodEnd: true,
  subscriptionCancelledAt: true,
} satisfies Prisma.UserSelect;

export type AuthUser = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;
