import { BudgetService } from './budget.service';

describe('BudgetService', () => {
  const prisma = {
    budget: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    expense: {
      deleteMany: jest.fn(),
    },
  };

  let service: BudgetService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BudgetService(prisma as any);
    prisma.budget.updateMany.mockResolvedValue({ count: 0 });
    prisma.budget.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        createdAt: new Date(),
      }),
    );
  });

  it('creates monthly budgets that cover the full last day of the month', async () => {
    const budget = await service.createMonthlyBudget('user-1', 450, {
      year: 2026,
      month: 1,
    });

    expect(budget.periodStart).toEqual(new Date(2026, 1, 1, 0, 0, 0, 0));
    expect(budget.periodEnd).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
    expect(prisma.budget.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: 'user-1' }),
      data: { isActive: false },
    });
  });

  it('finds a historical budget by month without requiring it to be active', async () => {
    const historicalBudget = {
      id: 'budget-april',
      userId: 'user-1',
      isActive: false,
    };
    prisma.budget.findFirst.mockResolvedValue(historicalBudget);

    const result = await service.getBudgetByMonth('user-1', 2026, 3);

    expect(result).toBe(historicalBudget);
    expect(prisma.budget.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        periodStart: { lte: new Date(2026, 4, 0, 23, 59, 59, 999) },
        periodEnd: { gte: new Date(2026, 3, 1, 0, 0, 0, 0) },
      },
      orderBy: { periodStart: 'desc' },
    });
    expect(prisma.budget.create).not.toHaveBeenCalled();
    expect(prisma.budget.updateMany).not.toHaveBeenCalled();
  });

  it('normalizes updated period boundaries', async () => {
    prisma.budget.findFirst.mockResolvedValue({
      id: 'budget-1',
      userId: 'user-1',
    });
    prisma.budget.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'budget-1',
        ...data,
      }),
    );

    const budget = await service.updateBudget('budget-1', 'user-1', {
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
    });

    expect(budget.periodStart).toEqual(new Date(2026, 2, 1, 0, 0, 0, 0));
    expect(budget.periodEnd).toEqual(new Date(2026, 2, 31, 23, 59, 59, 999));
  });
});
