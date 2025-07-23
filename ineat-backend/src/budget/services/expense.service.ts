import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Expense } from '@prisma/client';
import {
  CreateExpenseData,
  CreateExpenseFromProductData,
  UpdateExpenseData,
  ExpenseFilters,
  ExpenseStats,
  ExpenseWithDisplay,
  CreateExpenseFromProductResult,
  ExpenseImpact,
  AutoCreateExpenseOptions,
  ExpenseNotFoundError,
  InvalidExpenseDateError,
  BudgetNotFoundForExpenseError,
  formatExpenseDisplay,
  calculateExpenseStats,
  validateExpenseForBudget,
  autoDetectCategory,
} from '../schemas/expense.schema';
import { BudgetService } from './budget.service';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetService: BudgetService,
  ) {}

  /**
   * Crée une nouvelle dépense
   */
  async createExpense(userId: string, data: CreateExpenseData): Promise<Expense> {
    let budgetId = data.budgetId;

    // Si pas de budget spécifié, chercher le budget du mois correspondant à la date
    if (!budgetId) {
      const expenseDate = new Date(data.date);
      budgetId = await this.findBudgetForDate(userId, expenseDate);
      
      if (!budgetId) {
        throw new BudgetNotFoundForExpenseError(userId, data.date);
      }
    }

    // Valider que la dépense peut être ajoutée au budget
    const budget = await this.budgetService.getBudgetById(budgetId, userId);
    if (!budget) {
      throw new BudgetNotFoundForExpenseError(userId, data.date);
    }

    const validation = validateExpenseForBudget(data, budget);
    if (!validation.isValid) {
      throw new InvalidExpenseDateError(data.date, {
        start: budget.periodStart,
        end: budget.periodEnd,
      });
    }

    // Créer la dépense
    const expense = await this.prisma.expense.create({
      data: {
        userId,
        budgetId,
        amount: data.amount,
        date: new Date(data.date),
        source: data.source,
        category: data.category,
        notes: data.notes,
        receiptId: data.receiptId,
      },
    });

    return expense;
  }

  /**
   * Crée une dépense depuis l'ajout d'un produit à l'inventaire
   */
  async createExpenseFromProduct(
    userId: string,
    data: CreateExpenseFromProductData,
    options: AutoCreateExpenseOptions = { findOrCreateBudget: true }
  ): Promise<CreateExpenseFromProductResult> {
    const expenseDate = new Date(data.purchaseDate);
    
    // Chercher ou créer un budget pour cette date
    let budgetId = await this.findBudgetForDate(userId, expenseDate);
    
    if (!budgetId && options.findOrCreateBudget) {
      // Créer un budget automatiquement si demandé
      const lastBudget = await this.budgetService.getCurrentBudget(userId);
      if (lastBudget || options.defaultBudgetAmount) {
        const amount = lastBudget?.amount ?? options.defaultBudgetAmount ?? 300; // Budget par défaut
        const newBudget = await this.budgetService.createMonthlyBudget(userId, amount, {
          year: expenseDate.getFullYear(),
          month: expenseDate.getMonth(),
        });
        budgetId = newBudget.id;
      }
    }

    // Si pas de prix, enregistrer quand même l'achat pour le suivi
    if (!data.amount || data.amount === 0) {
      return {
        expense: null,
        budgetId,
        budgetUpdated: false,
        message: `Produit "${data.productName}" ajouté sans impact sur le budget (prix non renseigné)`,
      };
    }

    // Si on a un budget et un prix, créer la dépense
    if (budgetId && data.amount > 0) {
      const category = options.autoDetectCategory 
        ? autoDetectCategory(data.productName) ?? data.notes
        : undefined;

      const expense = await this.createExpense(userId, {
        budgetId,
        amount: data.amount,
        date: data.purchaseDate,
        source: data.source,
        category,
        notes: data.notes ? `${data.productName} - ${data.notes}` : data.productName,
      });

      return {
        expense,
        budgetId,
        budgetUpdated: true,
        message: `Dépense de ${data.amount.toFixed(2)}€ ajoutée au budget pour "${data.productName}"`,
      };
    }

    return {
      expense: null,
      budgetId,
      budgetUpdated: false,
      message: `Impossible d'ajouter la dépense pour "${data.productName}" (aucun budget disponible)`,
    };
  }

  /**
   * Met à jour une dépense existante
   */
  async updateExpense(expenseId: string, userId: string, data: UpdateExpenseData): Promise<Expense> {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId);
    }

    const updateData: Record<string, unknown> = {};
    
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.receiptId !== undefined) updateData.receiptId = data.receiptId;

    return this.prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
    });
  }

  /**
   * Récupère une dépense par son ID
   */
  async getExpenseById(expenseId: string, userId: string): Promise<Expense | null> {
    return this.prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });
  }

  /**
   * Récupère les dépenses avec filtres et pagination
   */
  async getExpenses(
    userId: string,
    filters?: ExpenseFilters,
    page = 1,
    pageSize = 20
  ): Promise<{ expenses: ExpenseWithDisplay[]; total: number; hasNext: boolean }> {
    const where: Record<string, unknown> = { userId };

    // Filtres
    if (filters?.budgetId) {
      where.budgetId = filters.budgetId;
    }

    if (filters?.dateRange) {
      where.date = {};
      if (filters.dateRange.startDate) {
        (where.date as Record<string, unknown>).gte = new Date(filters.dateRange.startDate);
      }
      if (filters.dateRange.endDate) {
        (where.date as Record<string, unknown>).lte = new Date(filters.dateRange.endDate);
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

    if (filters?.source) {
      where.source = { contains: filters.source, mode: 'insensitive' };
    }

    if (filters?.category) {
      where.category = { contains: filters.category, mode: 'insensitive' };
    }

    if (filters?.hasReceipt !== undefined) {
      where.receiptId = filters.hasReceipt ? { not: null } : null;
    }

    if (filters?.hasAmount !== undefined) {
      where.amount = filters.hasAmount ? { gt: 0 } : { equals: 0 };
    }

    if (filters?.search?.query) {
      where.OR = [
        { notes: { contains: filters.search.query, mode: 'insensitive' } },
        { source: { contains: filters.search.query, mode: 'insensitive' } },
        { category: { contains: filters.search.query, mode: 'insensitive' } },
      ];
    }

    // Requête avec pagination
    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.expense.count({ where }),
    ]);

    const expensesWithDisplay = expenses.map(formatExpenseDisplay);
    const hasNext = total > page * pageSize;

    return { expenses: expensesWithDisplay, total, hasNext };
  }

  /**
   * Récupère les dépenses d'un budget spécifique
   */
  async getBudgetExpenses(budgetId: string, userId: string): Promise<ExpenseWithDisplay[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { budgetId, userId },
      orderBy: { date: 'desc' },
    });

    return expenses.map(formatExpenseDisplay);
  }

  /**
   * Calcule les statistiques des dépenses
   */
  async getExpenseStats(userId: string, budgetId?: string): Promise<ExpenseStats> {
    const where: Record<string, unknown> = { userId };
    if (budgetId) {
      where.budgetId = budgetId;
    }

    const expenses = await this.prisma.expense.findMany({ where });
    return calculateExpenseStats(expenses);
  }

  /**
   * Calcule l'impact d'une dépense sur un budget
   */
  async calculateExpenseImpact(budgetId: string, userId: string, expenseAmount: number): Promise<ExpenseImpact> {
    const budget = await this.budgetService.getBudgetById(budgetId, userId);
    if (!budget) {
      throw new BudgetNotFoundForExpenseError(userId, 'unknown');
    }

    const currentStats = await this.budgetService.getBudgetStats(budgetId, userId);
    const newSpent = currentStats.totalSpent + expenseAmount;
    const remainingBudget = budget.amount - newSpent;
    const percentageUsed = (newSpent / budget.amount) * 100;

    // Déterminer si cela déclenche une alerte
    let triggersAlert = false;
    let alertType: 'THRESHOLD_75' | 'THRESHOLD_90' | 'OVER_BUDGET' | undefined;

    if (newSpent > budget.amount) {
      triggersAlert = true;
      alertType = 'OVER_BUDGET';
    } else if (percentageUsed >= 90 && currentStats.percentageUsed < 90) {
      triggersAlert = true;
      alertType = 'THRESHOLD_90';
    } else if (percentageUsed >= 75 && currentStats.percentageUsed < 75) {
      triggersAlert = true;
      alertType = 'THRESHOLD_75';
    }

    return {
      budgetId,
      previousSpent: currentStats.totalSpent,
      newSpent,
      remainingBudget,
      percentageUsed,
      triggersAlert,
      alertType,
    };
  }

  /**
   * Supprime une dépense
   */
  async deleteExpense(expenseId: string, userId: string): Promise<void> {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!expense) {
      throw new ExpenseNotFoundError(expenseId);
    }

    await this.prisma.expense.delete({
      where: { id: expenseId },
    });
  }

  /**
   * Récupère les dépenses récentes (utile pour le dashboard)
   */
  async getRecentExpenses(userId: string, limit = 10): Promise<ExpenseWithDisplay[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return expenses.map(formatExpenseDisplay);
  }

  /**
   * Récupère les dépenses sans prix (pour suivi des achats)
   */
  async getExpensesWithoutAmount(userId: string, budgetId?: string): Promise<Expense[]> {
    const where: Record<string, unknown> = { 
      userId,
      amount: 0,
    };
    
    if (budgetId) {
      where.budgetId = budgetId;
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  // --- Méthodes privées ---

  /**
   * Trouve le budget correspondant à une date donnée
   */
  private async findBudgetForDate(userId: string, date: Date): Promise<string | null> {
    const budget = await this.prisma.budget.findFirst({
      where: {
        userId,
        isActive: true,
        periodStart: { lte: date },
        periodEnd: { gte: date },
      },
    });

    return budget?.id || null;
  }

  /**
   * Valide qu'une dépense peut être ajoutée
   */
  private validateExpenseData(data: CreateExpenseData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.amount < 0) {
      errors.push('Le montant ne peut pas être négatif');
    }

    const expenseDate = new Date(data.date);
    const now = new Date();
    if (expenseDate > now) {
      errors.push('La date de dépense ne peut pas être dans le futur');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}