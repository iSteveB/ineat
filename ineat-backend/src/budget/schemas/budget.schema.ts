import { z } from 'zod';
import { Budget, Expense } from '@prisma/client';

// ===== SCHÉMAS DE BASE =====

export const UuidSchema = z.string().uuid();
export const DateStringSchema = z.string().datetime();
export const PriceSchema = z.coerce.number().min(0);

// ===== SCHÉMAS POUR LES DTOs =====

// Schéma de base sans validation croisée
const BaseBudgetSchema = z.object({
  amount: PriceSchema,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isActive: z.boolean().default(true),
});

// Schéma pour la création avec validation croisée
export const CreateBudgetSchema = BaseBudgetSchema.refine(
  (data) => new Date(data.periodStart) < new Date(data.periodEnd),
  {
    message: 'La date de fin doit être postérieure à la date de début',
    path: ['periodEnd'],
  }
);

// Schéma pour la mise à jour (partial du schéma de base)
export const UpdateBudgetSchema = BaseBudgetSchema.partial();

export const BudgetFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  dateRange: z.object({
    startDate: DateStringSchema.optional(),
    endDate: DateStringSchema.optional(),
  }).optional(),
  amountRange: z.object({
    min: PriceSchema.optional(),
    max: PriceSchema.optional(),
  }).optional(),
});

// ===== SCHÉMAS POUR LES PARAMÈTRES =====

export const BudgetParamsSchema = z.object({
  budgetId: UuidSchema,
});

export const UserIdSchema = z.object({
  userId: UuidSchema,
});

// ===== SCHÉMAS POUR LES RÉPONSES =====

export const BudgetStatsSchema = z.object({
  totalBudget: z.number().min(0),
  totalSpent: z.number().min(0),
  remaining: z.number(),
  percentageUsed: z.number().min(0).max(100),
  projectedSpending: z.number().min(0),
  daysRemaining: z.number().int().min(0),
  averageDailySpending: z.number().min(0),
  suggestedDailyBudget: z.number().min(0),
  isOverBudget: z.boolean(),
  isNearBudget: z.boolean(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  categoryBreakdown: z.array(z.object({
    category: z.string(),
    amount: z.number().min(0),
    percentage: z.number().min(0).max(100),
    transactionCount: z.number().int().min(0),
  })),
  sourceBreakdown: z.array(z.object({
    source: z.string(),
    amount: z.number().min(0),
    percentage: z.number().min(0).max(100),
    transactionCount: z.number().int().min(0),
  })),
  dailySpending: z.array(z.object({
    date: z.string(),
    amount: z.number().min(0),
    cumulativeAmount: z.number().min(0),
  })),
});

export const BudgetAlertSchema = z.object({
  id: UuidSchema,
  budgetId: UuidSchema,
  type: z.enum(['THRESHOLD_75', 'THRESHOLD_90', 'OVER_BUDGET', 'DAILY_LIMIT']),
  title: z.string(),
  message: z.string(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  isRead: z.boolean().default(false),
  actionRequired: z.boolean().default(false),
  suggestions: z.array(z.string()).optional(),
  createdAt: DateStringSchema,
  updatedAt: DateStringSchema,
});

// ===== TYPES INFÉRÉS =====

export type CreateBudgetData = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetData = z.infer<typeof UpdateBudgetSchema>;
export type BudgetFilters = z.infer<typeof BudgetFiltersSchema>;
export type BudgetParams = z.infer<typeof BudgetParamsSchema>;
export type BudgetStats = z.infer<typeof BudgetStatsSchema>;
export type BudgetAlert = z.infer<typeof BudgetAlertSchema>;

// ===== TYPES SPÉCIFIQUES AU SERVICE =====

/**
 * Budget avec ses dépenses (pour les statistiques)
 */
export type BudgetWithExpenses = Budget & {
  expenses: Expense[];
};

/**
 * Résultat de vérification d'alerte
 */
export interface AlertCheckResult {
  shouldAlert: boolean;
  alertType: BudgetAlert['type'] | null;
}

/**
 * Options pour la création automatique de budget mensuel
 */
export interface MonthlyBudgetOptions {
  year?: number;
  month?: number; // 0-11 (janvier = 0)
}

// ===== ERREURS CUSTOM =====

export class BudgetNotFoundError extends Error {
  constructor(budgetId: string) {
    super(`Budget avec l'ID ${budgetId} introuvable`);
    this.name = 'BudgetNotFoundError';
  }
}

export class BudgetValidationError extends Error {
  constructor(message: string, public readonly errors: string[]) {
    super(message);
    this.name = 'BudgetValidationError';
  }
}

// ===== UTILITAIRES =====

/**
 * Calcule les statistiques d'un budget
 */
export function calculateBudgetStats(budget: Budget, expenses: Expense[]): BudgetStats {
  const totalBudget = budget.amount;
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = totalBudget - totalSpent;
  const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Calcul des jours
  const startDate = new Date(budget.periodStart);
  const endDate = new Date(budget.periodEnd);
  const today = new Date();

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  const averageDailySpending = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
  const suggestedDailyBudget = daysRemaining > 0 ? remaining / daysRemaining : 0;
  const projectedSpending = daysRemaining > 0 ? totalSpent + (averageDailySpending * daysRemaining) : totalSpent;

  // Alertes
  const isOverBudget = totalSpent > totalBudget;
  const isNearBudget = percentageUsed > 75;

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (isOverBudget || projectedSpending > totalBudget * 1.1) {
    riskLevel = 'HIGH';
  } else if (isNearBudget || projectedSpending > totalBudget) {
    riskLevel = 'MEDIUM';
  }

  return {
    totalBudget,
    totalSpent,
    remaining,
    percentageUsed: Math.min(percentageUsed, 100),
    projectedSpending,
    daysRemaining,
    averageDailySpending,
    suggestedDailyBudget: Math.max(0, suggestedDailyBudget),
    isOverBudget,
    isNearBudget,
    riskLevel,
    categoryBreakdown: [], // À implémenter
    sourceBreakdown: [], // À implémenter
    dailySpending: [], // À implémenter
  };
}

/**
 * Détermine si une alerte doit être envoyée
 */
export function shouldTriggerAlert(stats: BudgetStats, lastAlertPercentage = 0): AlertCheckResult {
  const { percentageUsed, isOverBudget } = stats;

  if (isOverBudget && lastAlertPercentage < 100) {
    return { shouldAlert: true, alertType: 'OVER_BUDGET' };
  }

  if (percentageUsed >= 90 && lastAlertPercentage < 90) {
    return { shouldAlert: true, alertType: 'THRESHOLD_90' };
  }

  if (percentageUsed >= 75 && lastAlertPercentage < 75) {
    return { shouldAlert: true, alertType: 'THRESHOLD_75' };
  }

  return { shouldAlert: false, alertType: null };
}

/**
 * Type guard pour vérifier si un budget a des dépenses
 */
export function budgetHasExpenses(budget: Budget | BudgetWithExpenses): budget is BudgetWithExpenses {
  return 'expenses' in budget && Array.isArray(budget.expenses);
}

/**
 * Vérifie si un budget est pour le mois courant
 */
export function isCurrentMonthBudget(budget: Budget): boolean {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return budget.periodStart >= startOfMonth && budget.periodEnd <= endOfMonth;
}