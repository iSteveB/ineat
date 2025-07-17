import {
  Budget,
  Expense,
  BudgetStats,
  ValidationResult,
  AlertCheck,
  CategoryBreakdown,
  SourceBreakdown,
  DailySpending,
} from '../types/budget.type';

import { CreateExpenseDto } from '../dto/budget.dto';

/**
 * Calcule les statistiques d'un budget
 */
export function calculateBudgetStats(
  budget: Budget,
  expenses: Expense[],
): BudgetStats {
  const totalBudget = budget.amount;
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = totalBudget - totalSpent;
  const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Calcul des jours
  const startDate = new Date(budget.periodStart);
  const endDate = new Date(budget.periodEnd);
  const today = new Date();

  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysElapsed = Math.ceil(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  const averageDailySpending = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
  const suggestedDailyBudget =
    daysRemaining > 0 ? remaining / daysRemaining : 0;

  // Projection
  const projectedSpending =
    daysRemaining > 0
      ? totalSpent + averageDailySpending * daysRemaining
      : totalSpent;

  // Niveaux d'alerte
  const isOverBudget = totalSpent > totalBudget;
  const isNearBudget = percentageUsed > 75;

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (isOverBudget || projectedSpending > totalBudget * 1.1) {
    riskLevel = 'HIGH';
  } else if (isNearBudget || projectedSpending > totalBudget) {
    riskLevel = 'MEDIUM';
  }

  // Calcul des répartitions
  const categoryBreakdown = calculateCategoryBreakdown(expenses);
  const sourceBreakdown = calculateSourceBreakdown(expenses);
  const dailySpending = calculateDailySpending(expenses, startDate, endDate);

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
    categoryBreakdown,
    sourceBreakdown,
    dailySpending,
  };
}

/**
 * Calcule la répartition par catégorie (basée sur source pour l'instant)
 */
function calculateCategoryBreakdown(expenses: Expense[]): CategoryBreakdown[] {
  // Comme nous n'avons pas de champ category, nous utilisons source pour la catégorisation
  const categoryMap = new Map<string, { amount: number; count: number }>();
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  expenses.forEach((expense) => {
    // On utilise la source comme catégorie de base
    const category = expense.source || 'Non spécifié';
    const current = categoryMap.get(category) || { amount: 0, count: 0 };
    categoryMap.set(category, {
      amount: current.amount + expense.amount,
      count: current.count + 1,
    });
  });

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Calcule la répartition par source
 */
function calculateSourceBreakdown(expenses: Expense[]): SourceBreakdown[] {
  const sourceMap = new Map<string, { amount: number; count: number }>();
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  expenses.forEach((expense) => {
    const source = expense.source || 'Non spécifié';
    const current = sourceMap.get(source) || { amount: 0, count: 0 };
    sourceMap.set(source, {
      amount: current.amount + expense.amount,
      count: current.count + 1,
    });
  });

  return Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Calcule les dépenses journalières
 */
function calculateDailySpending(
  expenses: Expense[],
  startDate: Date,
  endDate: Date,
): DailySpending[] {
  const dailyMap = new Map<string, number>();

  expenses.forEach((expense) => {
    const dateKey = expense.date.toISOString().split('T')[0];
    const current = dailyMap.get(dateKey) || 0;
    dailyMap.set(dateKey, current + expense.amount);
  });

  const result: DailySpending[] = [];
  let cumulativeAmount = 0;

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const dailyAmount = dailyMap.get(dateKey) || 0;
    cumulativeAmount += dailyAmount;

    result.push({
      date: dateKey,
      amount: dailyAmount,
      cumulativeAmount,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

/**
 * Détermine si une alerte doit être envoyée
 */
export function shouldTriggerAlert(
  stats: BudgetStats,
  lastAlertPercentage: number = 0,
): AlertCheck {
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
 * Génère des suggestions pour optimiser le budget
 */
export function generateBudgetSuggestions(stats: BudgetStats): string[] {
  const suggestions: string[] = [];

  if (stats.isOverBudget) {
    suggestions.push(
      'Votre budget est dépassé. Essayez de réduire vos dépenses non essentielles.',
    );
  } else if (stats.riskLevel === 'HIGH') {
    suggestions.push(
      'Attention : vous risquez de dépasser votre budget. Surveillez vos prochains achats.',
    );
  } else if (stats.riskLevel === 'MEDIUM') {
    suggestions.push(
      'Vous êtes sur la bonne voie, mais restez vigilant sur vos dépenses.',
    );
  }

  if (
    stats.daysRemaining > 0 &&
    stats.suggestedDailyBudget < stats.averageDailySpending
  ) {
    suggestions.push(
      `Essayez de limiter vos dépenses à ${stats.suggestedDailyBudget.toFixed(
        2,
      )}€ par jour.`,
    );
  }

  // Suggestions basées sur les sources de dépenses
  const topSource = stats.categoryBreakdown[0]; // categoryBreakdown utilise maintenant les sources
  if (topSource && topSource.percentage > 50) {
    suggestions.push(
      `La source "${topSource.category}" représente ${topSource.percentage.toFixed(
        1,
      )}% de vos dépenses. Surveillez cette source.`,
    );
  }

  return suggestions;
}

/**
 * Valide qu'une dépense peut être ajoutée à un budget
 */
export function validateExpenseForBudget(
  expense: CreateExpenseDto,
  budget: Budget,
): ValidationResult {
  const expenseDate = new Date(expense.date);
  const budgetStart = new Date(budget.periodStart);
  const budgetEnd = new Date(budget.periodEnd);

  if (expenseDate < budgetStart || expenseDate > budgetEnd) {
    return {
      isValid: false,
      error:
        'La date de la dépense doit être comprise dans la période du budget',
    };
  }

  if (expense.amount <= 0) {
    return {
      isValid: false,
      error: 'Le montant de la dépense doit être supérieur à zéro',
    };
  }

  return { isValid: true };
}

/**
 * Formate un montant en euros
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Calcule le pourcentage d'évolution entre deux valeurs
 */
export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Détermine la couleur d'alerte selon le pourcentage utilisé
 */
export function getBudgetAlertColor(
  percentageUsed: number,
): 'success' | 'warning' | 'danger' {
  if (percentageUsed < 75) return 'success';
  if (percentageUsed < 90) return 'warning';
  return 'danger';
}

/**
 * Génère un message de statut pour le budget
 */
export function getBudgetStatusMessage(stats: BudgetStats): string {
  if (stats.isOverBudget) {
    return `Budget dépassé de ${formatAmount(Math.abs(stats.remaining))}`;
  }

  if (stats.percentageUsed >= 90) {
    return `Plus que ${formatAmount(stats.remaining)} disponibles`;
  }

  if (stats.percentageUsed >= 75) {
    return `${formatAmount(stats.remaining)} restants pour ${stats.daysRemaining} jours`;
  }

  return `${formatAmount(stats.remaining)} disponibles`;
}
