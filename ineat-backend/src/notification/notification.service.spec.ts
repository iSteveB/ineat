import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const prisma = {
    inventoryItem: {
      findMany: jest.fn(),
    },
    budget: {
      findFirst: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    receipt: {
      findUnique: jest.fn(),
    },
  };

  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService(prisma as any);
  });

  it('synchronizes expiry and budget alerts before listing notifications', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        expiryDate: new Date(),
        Product: { name: 'Yaourt nature' },
      },
    ]);
    prisma.budget.findFirst.mockResolvedValue({
      id: 'budget-1',
      amount: 100,
      Expense: [{ amount: 92 }],
    });
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.notification.create.mockImplementation(({ data }) =>
      Promise.resolve(data),
    );
    prisma.notification.findMany.mockResolvedValue([]);

    await service.listNotifications('user-1');

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: 'EXPIRY',
        title: 'Produit à consommer très vite',
        referenceId: 'item-1',
        referenceType: 'inventory_item',
      }),
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: 'BUDGET',
        title: 'Budget presque épuisé',
        referenceId: 'budget-1',
        referenceType: 'budget:threshold_90',
      }),
    });
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
  });

  it('updates an existing notification instead of duplicating it', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        expiryDate: new Date(),
        Product: { name: 'Yaourt nature' },
      },
    ]);
    prisma.budget.findFirst.mockResolvedValue(null);
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
    });
    prisma.notification.update.mockResolvedValue({
      id: 'notification-1',
      isRead: false,
    });
    prisma.notification.count.mockResolvedValue(1);

    await expect(service.countUnread('user-1')).resolves.toBe(1);

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: expect.objectContaining({
        isRead: false,
      }),
    });
  });

  it('marks one or all notifications as read', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
      userId: 'user-1',
    });
    prisma.notification.update.mockResolvedValue({
      id: 'notification-1',
      isRead: true,
    });
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });

    await expect(
      service.markAsRead('user-1', 'notification-1'),
    ).resolves.toMatchObject({
      id: 'notification-1',
      isRead: true,
    });
    await expect(service.markAllAsRead('user-1')).resolves.toEqual({
      count: 3,
    });
  });

  it('creates receipt status notifications', async () => {
    prisma.receipt.findUnique.mockResolvedValue({
      id: 'receipt-1',
      userId: 'user-1',
      merchantName: 'Marché central',
      totalAmount: 24.9,
    });
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.notification.create.mockImplementation(({ data }) =>
      Promise.resolve(data),
    );

    await service.createReceiptNotification('receipt-1', 'COMPLETED');

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: 'SYSTEM',
        title: 'Ticket traité',
        referenceId: 'receipt-1',
        referenceType: 'receipt',
      }),
    });
  });
});
