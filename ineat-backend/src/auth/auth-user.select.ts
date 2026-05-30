import { Prisma } from '../../prisma/generated/prisma/client';

export const authUserSelect = {
  id: true,
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  profileType: true,
  preferences: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  subscriptionPlan: true,
  subscriptionStatus: true,
  trialStartedAt: true,
  trialEndsAt: true,
  currentPeriodStartedAt: true,
  currentPeriodEndsAt: true,
} satisfies Prisma.UserSelect;

export type AuthUser = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;
