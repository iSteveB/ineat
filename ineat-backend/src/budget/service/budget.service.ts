import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import {
  Budget,
  Expense,
  BudgetStats,
  BudgetComparison,
  BudgetAlert,
  BudgetSetupStatus,
} from '../types/budget.type';

import {
  calculateBudgetStats,
  shouldTriggerAlert,
  generateBudgetSuggestions,
  validateExpenseForBudget,
} from '../utils/budget.utils'; 

import {
  CreateBudgetDto,
  UpdateBudgetDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  BudgetFiltersDto,
  ExpenseFiltersDto,
  CreateInitialBudgetDto,
  AddProductExpenseDto,
} from '../dto/budget.dto';

import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== GESTION DES BUDGETS =====

  /**
   * Crée le budget initial pour le mois en cours
   */
  async createInitialBudget(
    userId: string,
    dto: CreateInitialBudgetDto,
  ): Promise<Budget> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Vérifier qu'il n'y a pas déjà un budget pour ce mois
    const existingBudget = await this.getCurrentMonthBudget(userId);
    if (existingBudget) {
      throw new BadRequestException('Un budget existe déjà pour ce mois');
    }

    return this.createBudget(userId, {
      amount: dto.amount,
      periodStart: monthStart.toISOString().split('T')[0],
      periodEnd: monthEnd.toISOString().split('T')[0],
      isActive: true,
    });
  }

  /**
   * Crée un nouveau budget pour un utilisateur
   */
  async createBudget(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    // Vérifier qu'il n'y a pas déjà un budget actif pour la même période
    const existingBudget = await this.prisma.budget.findFirst({
      where: {
        userId,
        isActive: true,
        OR: [
          {
            periodStart: {
              lte: new Date(dto.periodEnd),
            },
            periodEnd: {
              gte: new Date(dto.periodStart),
            },
          },
        ],
      },
    });

    if (existingBudget) {
      throw new BadRequestException(
        'Un budget actif existe déjà pour cette période',
      );
    }

    return this.prisma.budget.create({
      data: {
        userId,
        amount: dto.amount,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Récupère le budget actuel d'un utilisateur
   */
  async getCurrentBudget(userId: string): Promise<Budget | null> {
    const now = new Date();

    return this.prisma.budget.findFirst({
      where: {
        userId,
        isActive: true,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Récupère le budget du mois en cours
   */
  async getCurrentMonthBudget(userId: string): Promise<Budget | null> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return this.prisma.budget.findFirst({
      where: {
        userId,
        periodStart: { gte: monthStart },
        periodEnd: { lte: monthEnd },
        isActive: true,
      },
    });
  }

  /**
   * Crée automatiquement le budget du mois en cours basé sur le dernier budget
   */
  async createCurrentMonthBudgetFromPrevious(
    userId: string,
  ): Promise<Budget | null> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Vérifier qu'il n'y a pas déjà un budget pour ce mois
    const existingBudget = await this.getCurrentMonthBudget(userId);
    if (existingBudget) {
      return existingBudget;
    }

    // Récupérer le dernier budget de l'utilisateur
    const lastBudget = await this.prisma.budget.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastBudget) {
      return null; // L'utilisateur n'a jamais défini de budget
    }

    // Créer le nouveau budget avec le même montant
    return this.createBudget(userId, {
      amount: lastBudget.amount,
      periodStart: monthStart.toISOString().split('T')[0],
      periodEnd: monthEnd.toISOString().split('T')[0],
      isActive: true,
    } as CreateBudgetDto);
  }

  /**
   * Vérifie si l'utilisateur a besoin de définir un budget
   */
  async needsBudgetSetup(userId: string): Promise<BudgetSetupStatus> {
    const currentBudget = await this.getCurrentMonthBudget(userId);
    const hasPreviousBudget = await this.prisma.budget.findFirst({
      where: { userId },
    });

    return {
      needsSetup: !currentBudget,
      hasCurrentBudget: !!currentBudget,
      hasPreviousBudget: !!hasPreviousBudget,
      suggestedAmount: hasPreviousBudget?.amount,
    };
  }

  /**
   * Met à jour un budget
   */
  async updateBudget(
    budgetId: string,
    userId: string,
    dto: UpdateBudgetDto,
  ): Promise<Budget> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
    });

    if (!budget) {
      throw new NotFoundException('Budget non trouvé');
    }

    return this.prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.periodStart && { periodStart: new Date(dto.periodStart) }),
        ...(dto.periodEnd && { periodEnd: new Date(dto.periodEnd) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Supprime un budget
   */
  async deleteBudget(budgetId: string, userId: string): Promise<void> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
    });

    if (!budget) {
      throw new NotFoundException('Budget non trouvé');
    }

    await this.prisma.budget.delete({
      where: { id: budgetId },
    });
  }

  /**
   * Liste les budgets d'un utilisateur avec filtres
   */
  async getBudgets(
    userId: string,
    filters: BudgetFiltersDto = {},
    page = 1,
    pageSize = 10,
  ): Promise<{ budgets: Budget[]; total: number }> {
    const where: any = { userId };

    // Filtres
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.dateRange) {
      if (filters.dateRange.startDate) {
        where.periodStart = { gte: new Date(filters.dateRange.startDate) };
      }
      if (filters.dateRange.endDate) {
        where.periodEnd = { lte: new Date(filters.dateRange.endDate) };
      }
    }

    if (filters.amountRange) {
      where.amount = {};
      if (filters.amountRange.min !== undefined) {
        where.amount.gte = filters.amountRange.min;
      }
      if (filters.amountRange.max !== undefined) {
        where.amount.lte = filters.amountRange.max;
      }
    }

    const [budgets, total] = await this.prisma.$transaction([
      this.prisma.budget.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.budget.count({ where }),
    ]);

    return { budgets, total };
  }

  // ===== GESTION DES DÉPENSES =====

  /**
   * Ajoute une dépense (appelé lors de l'ajout de produits)
   */
  async addExpense(userId: string, dto: CreateExpenseDto): Promise<Expense> {
    let budget: Budget | null = null;

    // Si aucun budget spécifié, trouver le budget approprié
    if (!dto.budgetId) {
      const expenseDate = new Date(dto.date);

      budget = await this.prisma.budget.findFirst({
        where: {
          userId,
          isActive: true,
          periodStart: { lte: expenseDate },
          periodEnd: { gte: expenseDate },
        },
      });

      // Si pas de budget pour cette période, vérifier s'il faut créer depuis le précédent
      if (!budget) {
        const budgetSetup = await this.needsBudgetSetup(userId);

        if (budgetSetup.hasPreviousBudget && !budgetSetup.hasCurrentBudget) {
          // L'utilisateur a déjà défini un budget, on reporte automatiquement
          budget = await this.createCurrentMonthBudgetFromPrevious(userId);
        }

        if (!budget) {
          throw new BadRequestException(
            budgetSetup.hasPreviousBudget
              ? 'Aucun budget défini pour cette période'
              : "Vous devez définir un budget avant d'ajouter des dépenses",
          );
        }
      }
    } else {
      budget = await this.prisma.budget.findFirst({
        where: { id: dto.budgetId, userId },
      });
    }

    if (!budget) {
      throw new BadRequestException('Aucun budget trouvé pour cette dépense');
    }

    // Valider que la dépense peut être ajoutée au budget
    const validation = validateExpenseForBudget(dto, budget);
    if (!validation.isValid) {
      throw new BadRequestException(validation.error);
    }

    const expense = await this.prisma.expense.create({
      data: {
        userId,
        budgetId: budget.id,
        amount: dto.amount,
        date: new Date(dto.date),
        source: dto.source,
        notes: dto.notes,
        receiptId: dto.receiptId,
      },
    });

    // Vérifier les alertes après ajout de la dépense
    await this.checkBudgetAlerts(budget.id);

    return expense;
  }

  /**
   * Ajoute automatiquement une dépense lors de l'achat de produits
   */
  async addProductExpense(
    userId: string,
    dto: AddProductExpenseDto,
  ): Promise<Expense> {
    return this.addExpense(userId, {
      amount: dto.amount,
      date: new Date().toISOString().split('T')[0],
      source: dto.source || 'Ajout de produit',
      receiptId: dto.receiptId,
    });
  }

  /**
   * Met à jour une dépense
   */
  async updateExpense(
    expenseId: string,
    userId: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      throw new NotFoundException('Dépense non trouvée');
    }

    const updatedExpense = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.source && { source: dto.source }),
        ...(dto.notes && { notes: dto.notes }),
      },
    });

    // Re-vérifier les alertes après modification
    await this.checkBudgetAlerts(expense.budgetId);

    return updatedExpense;
  }

  /**
   * Supprime une dépense
   */
  async deleteExpense(expenseId: string, userId: string): Promise<void> {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      throw new NotFoundException('Dépense non trouvée');
    }

    await this.prisma.expense.delete({
      where: { id: expenseId },
    });

    // Re-vérifier les alertes après suppression
    await this.checkBudgetAlerts(expense.budgetId);
  }

  /**
   * Liste les dépenses avec filtres
   */
  async getExpenses(
    userId: string,
    filters: ExpenseFiltersDto = {},
    page = 1,
    pageSize = 10,
  ): Promise<{ expenses: Expense[]; total: number }> {
    const where: any = { userId };

    // Filtres
    if (filters.budgetId) {
      where.budgetId = filters.budgetId;
    }

    if (filters.dateRange) {
      where.date = {};
      if (filters.dateRange.startDate) {
        where.date.gte = startOfDay(new Date(filters.dateRange.startDate));
      }
      if (filters.dateRange.endDate) {
        where.date.lte = endOfDay(new Date(filters.dateRange.endDate));
      }
    }

    if (filters.amountRange) {
      where.amount = {};
      if (filters.amountRange.min !== undefined) {
        where.amount.gte = filters.amountRange.min;
      }
      if (filters.amountRange.max !== undefined) {
        where.amount.lte = filters.amountRange.max;
      }
    }

    if (filters.source) {
      where.source = { contains: filters.source, mode: 'insensitive' };
    }

    if (filters.hasReceipt !== undefined) {
      where.receiptId = filters.hasReceipt ? { not: null } : null;
    }

    const [expenses, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { expenses, total };
  }

  // ===== STATISTIQUES ET ANALYTICS =====

  /**
   * Calcule les statistiques d'un budget
   */
  async getBudgetStats(budgetId: string, userId: string): Promise<BudgetStats> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
    });

    if (!budget) {
      throw new NotFoundException('Budget non trouvé');
    }

    const expenses = await this.prisma.expense.findMany({
      where: { budgetId },
      orderBy: { date: 'asc' },
    });

    return calculateBudgetStats(budget, expenses);
  }

  /**
   * Récupère les statistiques du budget actuel
   */
  async getCurrentBudgetStats(userId: string): Promise<BudgetStats | null> {
    const budget = await this.getCurrentMonthBudget(userId);
    if (!budget) return null;

    return this.getBudgetStats(budget.id, userId);
  }

  /**
   * Compare les budgets entre périodes
   */
  async compareBudgets(
    currentBudgetId: string,
    previousBudgetId: string,
    userId: string,
  ): Promise<BudgetComparison> {
    const currentStats = await this.getBudgetStats(currentBudgetId, userId);
    const previousStats = await this.getBudgetStats(previousBudgetId, userId);

    const changes = {
      totalSpentChange: currentStats.totalSpent - previousStats.totalSpent,
      percentageChange:
        previousStats.totalSpent > 0
          ? ((currentStats.totalSpent - previousStats.totalSpent) /
              previousStats.totalSpent) *
            100
          : 0,
      averageDailyChange:
        currentStats.averageDailySpending - previousStats.averageDailySpending,
      categoryChanges: [], // À implémenter selon les besoins
    };

    return {
      currentPeriod: currentStats,
      previousPeriod: previousStats,
      changes,
    };
  }

  // ===== ALERTES ET NOTIFICATIONS =====

  /**
   * Vérifie et génère les alertes pour un budget
   */
  async checkBudgetAlerts(budgetId: string): Promise<BudgetAlert[]> {
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) return [];

    const stats = await this.getBudgetStats(budgetId, budget.userId);

    // Récupérer la dernière alerte pour éviter les doublons
    const lastAlert = await this.prisma.notification.findFirst({
      where: {
        userId: budget.userId,
        type: 'BUDGET',
        referenceId: budgetId,
      },
      orderBy: { createdAt: 'desc' },
    });

    const lastAlertPercentage = lastAlert
      ? parseInt(lastAlert.message.match(/(\d+)%/)?.[1] || '0')
      : 0;

    const alertCheck = shouldTriggerAlert(stats, lastAlertPercentage);

    if (alertCheck.shouldAlert && alertCheck.alertType) {
      const suggestions = generateBudgetSuggestions(stats);

      // Créer la notification
      await this.prisma.notification.create({
        data: {
          userId: budget.userId,
          type: 'BUDGET',
          title: this.getAlertTitle(alertCheck.alertType, stats),
          message: this.getAlertMessage(
            alertCheck.alertType,
            stats,
            suggestions,
          ),
          referenceId: budgetId,
          referenceType: 'budget',
        },
      });
    }

    return [];
  }

  /**
   * Génère le titre d'une alerte
   */
  private getAlertTitle(
    alertType: BudgetAlert['type'],
    stats: BudgetStats,
  ): string {
    switch (alertType) {
      case 'THRESHOLD_75':
        return 'Budget à 75%';
      case 'THRESHOLD_90':
        return 'Budget presque épuisé';
      case 'OVER_BUDGET':
        return 'Budget dépassé';
      case 'DAILY_LIMIT':
        return 'Limite journalière atteinte';
      default:
        return 'Alerte budget';
    }
  }

  /**
   * Génère le message d'une alerte
   */
  private getAlertMessage(
    alertType: BudgetAlert['type'],
    stats: BudgetStats,
    suggestions: string[],
  ): string {
    const baseMessage = `Vous avez utilisé ${stats.percentageUsed.toFixed(1)}% de votre budget (${stats.totalSpent}€ sur ${stats.totalBudget}€).`;

    if (suggestions.length > 0) {
      return `${baseMessage} ${suggestions[0]}`;
    }

    return baseMessage;
  }
}
