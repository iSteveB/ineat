import { z } from 'zod';
import { Expense } from '../../../prisma/generated/prisma/client';

// ===== SCHÉMAS DE BASE =====

export const UuidSchema = z.string().uuid();
export const DateStringSchema = z.string().datetime();
export const DateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const PriceSchema = z.coerce.number().min(0);

// ===== SCHÉMAS POUR LES DTOs =====

// Schéma de base pour les dépenses
const BaseExpenseSchema = z.object({
  amount: PriceSchema,
  date: DateInputSchema.refine((date) => {
    const expenseDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return expenseDate <= today;
  }, 'La date de dépense ne peut pas être dans le futur'),
  source: z
    .string()
    .max(100, 'La source ne peut pas dépasser 100 caractères')
    .optional(),
  category: z
    .string()
    .max(50, 'La catégorie ne peut pas dépasser 50 caractères')
    .optional(),
  notes: z
    .string()
    .max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
    .transform((val) => val.trim())
    .optional(),
  receiptId: z.string().optional(),
});

// Schéma pour la création d'une dépense
export const CreateExpenseSchema = BaseExpenseSchema.extend({
  budgetId: UuidSchema.optional(), // Optionnel, sera déterminé automatiquement si non fourni
});

// Schéma pour la création d'une dépense depuis un produit acheté
export const CreateExpenseFromProductSchema = z.object({
  productName: z.string().min(1, 'Le nom du produit est requis'),
  amount: PriceSchema.optional(), // Optionnel pour les produits sans prix
  purchaseDate: DateInputSchema,
  source: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  inventoryItemId: UuidSchema.optional(), // Référence vers l'item d'inventaire
});

// Schéma pour la mise à jour d'une dépense
export const UpdateExpenseSchema = BaseExpenseSchema.omit({
  date: true,
}).partial();

// ===== SCHÉMAS POUR LES FILTRES =====

export const ExpenseFiltersSchema = z.object({
  budgetId: UuidSchema.optional(),
  dateRange: z
    .object({
      startDate: DateStringSchema.optional(),
      endDate: DateStringSchema.optional(),
    })
    .optional(),
  amountRange: z
    .object({
      min: PriceSchema.optional(),
      max: PriceSchema.optional(),
    })
    .optional(),
  source: z.string().optional(),
  category: z.string().optional(),
  hasReceipt: z.boolean().optional(),
  hasAmount: z.boolean().optional(), // Pour filtrer les dépenses avec/sans montant
  search: z
    .object({
      query: z.string().min(1).optional(),
      fields: z.array(z.string()).optional(),
    })
    .optional(),
});

// ===== SCHÉMAS POUR LES PARAMÈTRES =====

export const ExpenseParamsSchema = z.object({
  expenseId: UuidSchema,
});

export const BudgetExpensesParamsSchema = z.object({
  budgetId: UuidSchema,
});

// ===== SCHÉMAS POUR LES STATISTIQUES =====

export const ExpenseStatsSchema = z.object({
  totalExpenses: z.number().int().min(0),
  totalAmount: z.number().min(0),
  averageExpense: z.number().min(0),
  expensesWithoutAmount: z.number().int().min(0),

  // Répartition par catégorie
  categoryBreakdown: z.array(
    z.object({
      category: z.string(),
      count: z.number().int().min(0),
      amount: z.number().min(0),
      percentage: z.number().min(0).max(100),
    }),
  ),

  // Répartition par source
  sourceBreakdown: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().min(0),
      amount: z.number().min(0),
      percentage: z.number().min(0).max(100),
    }),
  ),

  // Évolution quotidienne
  dailyExpenses: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().min(0),
      amount: z.number().min(0),
    }),
  ),
});

// ===== TYPES INFÉRÉS =====

export type CreateExpenseData = z.infer<typeof CreateExpenseSchema>;
export type CreateExpenseFromProductData = z.infer<
  typeof CreateExpenseFromProductSchema
>;
export type UpdateExpenseData = z.infer<typeof UpdateExpenseSchema>;
export type ExpenseFilters = z.infer<typeof ExpenseFiltersSchema>;
export type ExpenseParams = z.infer<typeof ExpenseParamsSchema>;
export type ExpenseStats = z.infer<typeof ExpenseStatsSchema>;

// ===== TYPES SPÉCIFIQUES AU SERVICE =====

/**
 * Dépense avec des informations supplémentaires pour l'affichage
 */
export interface ExpenseWithDisplay extends Expense {
  displayAmount: string; // "25.50€" ou "-" si pas de montant
  categoryName?: string;
  sourceName?: string;
  hasReceipt: boolean;
}

/**
 * Résultat de création d'une dépense depuis un produit
 */
export interface CreateExpenseFromProductResult {
  expense: Expense | null; // null si pas de prix
  budgetId: string | null;
  budgetUpdated: boolean;
  message: string;
}

/**
 * Options pour la création automatique de dépense
 */
export interface AutoCreateExpenseOptions {
  findOrCreateBudget: boolean;
  defaultBudgetAmount?: number;
  autoDetectCategory?: boolean;
}

/**
 * Informations sur l'impact d'une dépense sur le budget
 */
export interface ExpenseImpact {
  budgetId: string;
  previousSpent: number;
  newSpent: number;
  remainingBudget: number;
  percentageUsed: number;
  triggersAlert: boolean;
  alertType?: 'THRESHOLD_75' | 'THRESHOLD_90' | 'OVER_BUDGET';
}

// ===== ERREURS CUSTOM =====

export class ExpenseNotFoundError extends Error {
  constructor(expenseId: string) {
    super(`Dépense avec l'ID ${expenseId} introuvable`);
    this.name = 'ExpenseNotFoundError';
  }
}

export class InvalidExpenseDateError extends Error {
  constructor(date: string, budgetPeriod: { start: Date; end: Date }) {
    super(
      `La date ${date} n'est pas dans la période du budget (${budgetPeriod.start.toLocaleDateString()} - ${budgetPeriod.end.toLocaleDateString()})`,
    );
    this.name = 'InvalidExpenseDateError';
  }
}

export class BudgetNotFoundForExpenseError extends Error {
  constructor(userId: string, date: string) {
    super(`Aucun budget trouvé pour l'utilisateur ${userId} à la date ${date}`);
    this.name = 'BudgetNotFoundForExpenseError';
  }
}

// ===== UTILITAIRES =====

/**
 * Formate l'affichage d'une dépense
 */
export function formatExpenseDisplay(expense: Expense): ExpenseWithDisplay {
  const displayAmount =
    expense.amount > 0 ? `${expense.amount.toFixed(2)}€` : '-';

  return {
    ...expense,
    displayAmount,
    hasReceipt: !!expense.receiptId,
  };
}

/**
 * Calcule les statistiques des dépenses
 */
export function calculateExpenseStats(expenses: Expense[]): ExpenseStats {
  const totalExpenses = expenses.length;
  const expensesWithAmount = expenses.filter((e) => e.amount > 0);
  const totalAmount = expensesWithAmount.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const averageExpense =
    expensesWithAmount.length > 0 ? totalAmount / expensesWithAmount.length : 0;
  const expensesWithoutAmount = expenses.filter((e) => e.amount === 0).length;

  // Répartition par catégorie (simplifié)
  const categoryMap = new Map<string, { count: number; amount: number }>();
  expenses.forEach((expense) => {
    const category = expense.category || 'Non catégorisé';
    const current = categoryMap.get(category) || { count: 0, amount: 0 };
    categoryMap.set(category, {
      count: current.count + 1,
      amount: current.amount + expense.amount,
    });
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }),
  );

  // Répartition par source (simplifié)
  const sourceMap = new Map<string, { count: number; amount: number }>();
  expenses.forEach((expense) => {
    const source = expense.source || 'Source inconnue';
    const current = sourceMap.get(source) || { count: 0, amount: 0 };
    sourceMap.set(source, {
      count: current.count + 1,
      amount: current.amount + expense.amount,
    });
  });

  const sourceBreakdown = Array.from(sourceMap.entries()).map(
    ([source, data]) => ({
      source,
      count: data.count,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }),
  );

  return {
    totalExpenses,
    totalAmount,
    averageExpense,
    expensesWithoutAmount,
    categoryBreakdown,
    sourceBreakdown,
    dailyExpenses: [], // À implémenter selon les besoins
  };
}

/**
 * Valide qu'une dépense peut être ajoutée à un budget
 */
export function validateExpenseForBudget(
  expense: CreateExpenseData,
  budget: { periodStart: Date; periodEnd: Date },
): { isValid: boolean; error?: string } {
  const expenseDate = new Date(expense.date);

  if (expenseDate < budget.periodStart || expenseDate > budget.periodEnd) {
    return {
      isValid: false,
      error: `La date de la dépense doit être comprise entre le ${budget.periodStart.toLocaleDateString()} et le ${budget.periodEnd.toLocaleDateString()}`,
    };
  }

  return { isValid: true };
}

/**
 * Détermine la catégorie automatiquement basée sur le nom du produit
 */
export function autoDetectCategory(productName: string): string | undefined {
  const name = productName.toLowerCase();

  if (
    name.includes('pain') ||
    name.includes('baguette') ||
    name.includes('croissant')
  ) {
    return 'Boulangerie';
  }
  if (
    name.includes('lait') ||
    name.includes('yaourt') ||
    name.includes('fromage')
  ) {
    return 'Produits laitiers';
  }
  if (
    name.includes('viande') ||
    name.includes('bœuf') ||
    name.includes('porc') ||
    name.includes('agneau')
  ) {
    return 'Viande';
  }
  if (
    name.includes('poisson') ||
    name.includes('saumon') ||
    name.includes('thon')
  ) {
    return 'Poisson';
  }
  if (
    name.includes('pomme') ||
    name.includes('banane') ||
    name.includes('orange')
  ) {
    return 'Fruits';
  }
  if (
    name.includes('salade') ||
    name.includes('carotte') ||
    name.includes('tomate')
  ) {
    return 'Légumes';
  }

  return undefined;
}

/**
 * Type guard pour vérifier si une dépense a un montant
 */
export function expenseHasAmount(expense: Expense): boolean {
  return expense.amount > 0;
}
