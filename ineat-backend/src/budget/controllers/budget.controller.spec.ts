import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { BudgetController } from './budget.controller';

describe('BudgetController', () => {
  const budgetService = {
    getBudgetByMonth: jest.fn(),
    getBudgetStats: jest.fn(),
  };
  const expenseService = {
    getBudgetExpenses: jest.fn(),
  };

  const request = {
    user: { id: 'user-1' },
  } as unknown as Request;

  let controller: BudgetController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BudgetController(
      budgetService as any,
      expenseService as any,
    );
  });

  it.each(['2026-00', '2026-13', 'avril-2026', '2026-4'])(
    'rejects the invalid month %s',
    async (month) => {
      await expect(
        controller.getBudgetByMonth(request, month),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(budgetService.getBudgetByMonth).not.toHaveBeenCalled();
    },
  );

  it('returns an explicit empty response when the month has no budget', async () => {
    budgetService.getBudgetByMonth.mockResolvedValue(null);

    await expect(
      controller.getBudgetByMonth(request, '2026-04'),
    ).resolves.toEqual({
      success: true,
      data: null,
      message: 'Aucun budget défini pour ce mois',
    });
    expect(budgetService.getBudgetByMonth).toHaveBeenCalledWith(
      'user-1',
      2026,
      3,
    );
    expect(budgetService.getBudgetStats).not.toHaveBeenCalled();
    expect(expenseService.getBudgetExpenses).not.toHaveBeenCalled();
  });

  it('returns the budget, its stats and its expenses for the requested month', async () => {
    const budget = { id: 'budget-april', isActive: false };
    const stats = { totalBudget: 450, totalSpent: 120 };
    const expenses = [{ id: 'expense-1', budgetId: budget.id, amount: 12 }];
    budgetService.getBudgetByMonth.mockResolvedValue(budget);
    budgetService.getBudgetStats.mockResolvedValue(stats);
    expenseService.getBudgetExpenses.mockResolvedValue(expenses);

    await expect(
      controller.getBudgetByMonth(request, '2026-04'),
    ).resolves.toEqual({
      success: true,
      data: { budget, stats, expenses, alerts: [] },
    });
    expect(budgetService.getBudgetStats).toHaveBeenCalledWith(
      budget.id,
      'user-1',
    );
    expect(expenseService.getBudgetExpenses).toHaveBeenCalledWith(
      budget.id,
      'user-1',
    );
  });
});
