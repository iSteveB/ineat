import { ExpenseService } from './expense.service';

describe('ExpenseService', () => {
  const prisma = {
    budget: {
      findFirst: jest.fn(),
    },
    expense: {
      create: jest.fn(),
    },
  };

  const budgetService = {
    getBudgetById: jest.fn(),
    getCurrentBudget: jest.fn(),
    createMonthlyBudget: jest.fn(),
  };

  let service: ExpenseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExpenseService(prisma as any, budgetService as any);
  });

  it('creates product expenses in the budget matching the purchase date', async () => {
    const budget = {
      id: 'budget-february',
      userId: 'user-1',
      amount: 300,
      periodStart: new Date(2026, 1, 1, 0, 0, 0, 0),
      periodEnd: new Date(2026, 1, 28, 23, 59, 59, 999),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const expense = {
      id: 'expense-1',
      userId: 'user-1',
      budgetId: budget.id,
      amount: 12.5,
      date: new Date('2026-02-15'),
      source: 'Ajout manuel',
      category: 'Fruits & Légumes',
      notes: 'Pommes',
      receiptId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prisma.budget.findFirst.mockResolvedValue(budget);
    budgetService.getBudgetById.mockResolvedValue(budget);
    prisma.expense.create.mockResolvedValue(expense);

    const result = await service.createExpenseFromProduct(
      'user-1',
      {
        productName: 'Pommes',
        amount: 12.5,
        purchaseDate: '2026-02-15',
        source: 'Ajout manuel',
      },
      { findOrCreateBudget: false, autoDetectCategory: true },
    );

    expect(prisma.budget.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        isActive: true,
        periodStart: { lte: new Date('2026-02-15') },
        periodEnd: { gte: new Date('2026-02-15') },
      },
    });
    expect(prisma.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        budgetId: 'budget-february',
        amount: 12.5,
        date: new Date('2026-02-15'),
        source: 'Ajout manuel',
        notes: 'Pommes',
      }),
    });
    expect(result).toEqual({
      expense,
      budgetId: 'budget-february',
      budgetUpdated: true,
      message: 'Dépense de 12.50€ ajoutée au budget pour "Pommes"',
    });
  });

  it('does not create a product expense when no budget exists for the purchase date', async () => {
    prisma.budget.findFirst.mockResolvedValue(null);

    const result = await service.createExpenseFromProduct(
      'user-1',
      {
        productName: 'Pâtes',
        amount: 2.1,
        purchaseDate: '2026-04-10',
        source: 'Ajout rapide',
      },
      { findOrCreateBudget: false },
    );

    expect(prisma.expense.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      expense: null,
      budgetId: null,
      budgetUpdated: false,
      message:
        'Impossible d\'ajouter la dépense pour "Pâtes" (aucun budget disponible)',
    });
  });
});
