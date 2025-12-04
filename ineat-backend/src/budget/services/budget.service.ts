import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Budget, Expense } from '../../../prisma/generated/prisma/client';
import {
  CreateBudgetData,
  UpdateBudgetData,
  BudgetStats,
  BudgetFilters,
  BudgetAlert,
  BudgetWithExpenses,
  AlertCheckResult,
  MonthlyBudgetOptions,
  BudgetNotFoundError,
  calculateBudgetStats,
  shouldTriggerAlert,
} from '../schemas/budget.schema';
import { randomUUID } from 'crypto';

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupère ou crée le budget du mois courant pour un utilisateur
   */
  async getCurrentBudget(userId: string): Promise<Budget | null> {
    const now = new Date();

    // Chercher un budget dont la période englobe la date actuelle
    let budget = await this.prisma.budget.findFirst({
      where: {
        userId,
        isActive: true,
        periodStart: {
          lte: now,
        },
        periodEnd: {
          gte: now,
        },
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    // Si pas de budget actif pour la période actuelle, créer automatiquement
    if (!budget) {
      const lastBudget = await this.getLastActiveBudget(userId);
      if (lastBudget) {
        budget = await this.createMonthlyBudget(userId, lastBudget.amount);
      }
    }

    return budget;
  }

  /**
   * Crée un nouveau budget mensuel
   */
  async createBudget(userId: string, data: CreateBudgetData): Promise<Budget> {
    const startDate = new Date(data.periodStart);
    const endDate = new Date(data.periodEnd);

    // Désactiver les budgets précédents qui chevauchent avec cette période
    await this.deactivateBudgetsForPeriod(userId, startDate, endDate);

    const budget = await this.prisma.budget.create({
      data: {
        id: randomUUID(),
        userId,
        amount: data.amount,
        periodStart: startDate,
        periodEnd: endDate,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      },
    });

    return budget;
  }

  /**
   * Crée automatiquement un budget pour le mois courant
   */
  async createMonthlyBudget(
    userId: string,
    amount: number,
    options?: MonthlyBudgetOptions,
  ): Promise<Budget> {
    const year = options?.year ?? new Date().getFullYear();
    const month = options?.month ?? new Date().getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return this.createBudget(userId, {
      amount,
      periodStart: startOfMonth.toISOString().split('T')[0],
      periodEnd: endOfMonth.toISOString().split('T')[0],
      isActive: true,
    });
  }

  /**
   * Met à jour un budget existant
   */
  async updateBudget(
    budgetId: string,
    userId: string,
    data: UpdateBudgetData,
  ): Promise<Budget> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
    });

    if (!budget) {
      throw new BudgetNotFoundError(budgetId);
    }

    const updateData: Record<string, unknown> = {};

    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.periodStart) updateData.periodStart = new Date(data.periodStart);
    if (data.periodEnd) updateData.periodEnd = new Date(data.periodEnd);

    return this.prisma.budget.update({
      where: { id: budgetId },
      data: updateData,
    });
  }

  /**
   * Récupère tous les budgets d'un utilisateur avec filtres
   */
  async getBudgets(userId: string, filters?: BudgetFilters): Promise<Budget[]> {
    const where: Record<string, unknown> = { userId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.dateRange) {
      if (filters.dateRange.startDate) {
        where.periodStart = { gte: new Date(filters.dateRange.startDate) };
      }
      if (filters.dateRange.endDate) {
        where.periodEnd = { lte: new Date(filters.dateRange.endDate) };
      }
    }

    if (filters?.amountRange) {
      where.amount = {};
      if (filters.amountRange.min !== undefined) {
        (where.amount as Record<string, unknown>).gte = filters.amountRange.min;
      }
      if (filters.amountRange.max !== undefined) {
        (where.amount as Record<string, unknown>).lte = filters.amountRange.max;
      }
    }

    return this.prisma.budget.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    });
  }

  /**
   * Récupère un budget par son ID
   */
  async getBudgetById(
    budgetId: string,
    userId: string,
  ): Promise<Budget | null> {
    return this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
    });
  }

  /**
   * Calcule les statistiques d'un budget avec ses dépenses
   */
  async getBudgetStats(budgetId: string, userId: string): Promise<BudgetStats> {
    const budget = (await this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
      include: {
        Expense: true,
      },
    })) as BudgetWithExpenses | null;

    if (!budget) {
      throw new BudgetNotFoundError(budgetId);
    }

    return calculateBudgetStats(budget, budget.Expense);
  }

  /**
   * Vérifie si des alertes doivent être envoyées pour un budget
   */
  async checkBudgetAlerts(
    budgetId: string,
    userId: string,
  ): Promise<BudgetAlert[]> {
    const stats = await this.getBudgetStats(budgetId, userId);
    const alerts: BudgetAlert[] = [];

    // Récupérer le dernier pourcentage d'alerte envoyé (à implémenter selon tes besoins)
    const lastAlertPercentage = 0; // TODO: récupérer depuis la DB ou cache

    const alertCheck: AlertCheckResult = shouldTriggerAlert(
      stats,
      lastAlertPercentage,
    );

    if (alertCheck.shouldAlert && alertCheck.alertType) {
      const alert: BudgetAlert = {
        id: crypto.randomUUID(),
        budgetId,
        type: alertCheck.alertType,
        title: this.getAlertTitle(alertCheck.alertType, stats),
        message: this.getAlertMessage(alertCheck.alertType, stats),
        severity: this.getAlertSeverity(alertCheck.alertType),
        isRead: false,
        actionRequired: alertCheck.alertType === 'OVER_BUDGET',
        suggestions: this.getAlertSuggestions(alertCheck.alertType, stats),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Supprime un budget et toutes ses dépenses associées
   */
  async deleteBudget(budgetId: string, userId: string): Promise<void> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
    });

    if (!budget) {
      throw new BudgetNotFoundError(budgetId);
    }

    // Supprimer en transaction pour assurer la cohérence
    await this.prisma.$transaction([
      this.prisma.expense.deleteMany({ where: { budgetId } }),
      this.prisma.budget.delete({ where: { id: budgetId } }),
    ]);
  }

  /**
   * Vérifie si un utilisateur a déjà un budget
   */
  async hasAnyBudget(userId: string): Promise<boolean> {
    const count = await this.prisma.budget.count({
      where: { userId },
    });
    return count > 0;
  }

  // --- Méthodes privées ---

  private async getLastActiveBudget(userId: string): Promise<Budget | null> {
    return this.prisma.budget.findFirst({
      where: { userId, isActive: true },
      orderBy: { periodStart: 'desc' },
    });
  }

  private async deactivateBudgetsForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    await this.prisma.budget.updateMany({
      where: {
        userId,
        OR: [
          {
            periodStart: { gte: startDate, lte: endDate },
          },
          {
            periodEnd: { gte: startDate, lte: endDate },
          },
          {
            AND: [
              { periodStart: { lte: startDate } },
              { periodEnd: { gte: endDate } },
            ],
          },
        ],
      },
      data: { isActive: false },
    });
  }

  private getAlertTitle(type: BudgetAlert['type'], stats: BudgetStats): string {
    switch (type) {
      case 'THRESHOLD_75':
        return '75% du budget consommé';
      case 'THRESHOLD_90':
        return '90% du budget consommé';
      case 'OVER_BUDGET':
        return 'Budget dépassé';
      case 'DAILY_LIMIT':
        return 'Limite journalière atteinte';
      default:
        return 'Alerte budget';
    }
  }

  private getAlertMessage(
    type: BudgetAlert['type'],
    stats: BudgetStats,
  ): string {
    switch (type) {
      case 'THRESHOLD_75':
        return `Vous avez utilisé ${stats.percentageUsed.toFixed(1)}% de votre budget mensuel.`;
      case 'THRESHOLD_90':
        return `Attention ! Vous avez utilisé ${stats.percentageUsed.toFixed(1)}% de votre budget mensuel.`;
      case 'OVER_BUDGET':
        return `Votre budget est dépassé de ${Math.abs(stats.remaining).toFixed(2)}€.`;
      case 'DAILY_LIMIT':
        return 'Vous avez atteint votre limite de dépenses quotidiennes suggérée.';
      default:
        return 'Une situation nécessite votre attention concernant votre budget.';
    }
  }

  private getAlertSeverity(type: BudgetAlert['type']): BudgetAlert['severity'] {
    switch (type) {
      case 'THRESHOLD_75':
        return 'INFO';
      case 'THRESHOLD_90':
      case 'DAILY_LIMIT':
        return 'WARNING';
      case 'OVER_BUDGET':
        return 'CRITICAL';
      default:
        return 'INFO';
    }
  }

  private getAlertSuggestions(
    type: BudgetAlert['type'],
    stats: BudgetStats,
  ): string[] {
    const suggestions: string[] = [];

    switch (type) {
      case 'THRESHOLD_75':
        suggestions.push('Surveillez vos prochains achats');
        suggestions.push('Consultez vos dépenses récentes');
        break;
      case 'THRESHOLD_90':
        suggestions.push('Limitez les achats non essentiels');
        suggestions.push(
          `Budget quotidien suggéré: ${stats.suggestedDailyBudget.toFixed(2)}€`,
        );
        break;
      case 'OVER_BUDGET':
        suggestions.push('Revoyez vos dépenses du mois');
        suggestions.push('Considérez augmenter votre budget mensuel');
        break;
    }

    return suggestions;
  }
}
