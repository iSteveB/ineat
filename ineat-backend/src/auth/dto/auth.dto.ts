import { z } from 'zod';
// Schéma pour l'utilisateur sécurisé (sans mot de passe)
export const SafeUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  defaultServings: z.number().int().min(1).max(20),
  primaryGoal: z
    .enum(['REDUCE_WASTE', 'SAVE_MONEY', 'EAT_BETTER', 'FIND_MEAL_IDEAS'])
    .nullable(),
  profileOnboardingCompletedAt: z.date().nullable(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  subscriptionPlan: z.enum(['FREE', 'TRIAL', 'PREMIUM']).optional(),
  subscriptionStatus: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']).optional(),
  trialStartedAt: z.date().nullable().optional(),
  trialEndsAt: z.date().nullable().optional(),
  trialUsedAt: z.date().nullable().optional(),
  currentPeriodStartedAt: z.date().nullable().optional(),
  currentPeriodEndsAt: z.date().nullable().optional(),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']).nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  subscriptionCancelledAt: z.date().nullable().optional(),
  preferences: z.object({}).passthrough().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SafeUserDto = z.infer<typeof SafeUserSchema>;
