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
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.notification.findMany.mockResolvedValue([]);
    service = new NotificationService(prisma as any);
  });

  it('synchronizes expiry and budget alerts explicitly', async () => {
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
    prisma.notification.findUnique.mockResolvedValue(null);
    prisma.notification.upsert.mockImplementation(({ create }) =>
      Promise.resolve(create),
    );
    prisma.notification.findMany.mockResolvedValue([]);

    await service.synchronizeUser('user-1');

    expect(prisma.notification.upsert).toHaveBeenCalledWith({
      where: { deduplicationKey: expect.stringMatching(/^[a-f0-9]{32}$/) },
      create: expect.objectContaining({
        userId: 'user-1',
        type: 'EXPIRY',
        title: 'Produit à consommer très vite',
        referenceId: 'item-1',
        referenceType: 'inventory_item',
      }),
      update: expect.any(Object),
    });
    expect(prisma.notification.upsert).toHaveBeenCalledWith({
      where: { deduplicationKey: expect.stringMatching(/^[a-f0-9]{32}$/) },
      create: expect.objectContaining({
        userId: 'user-1',
        type: 'BUDGET',
        title: 'Budget presque épuisé',
        referenceId: 'budget-1',
        referenceType: 'budget:threshold_90',
      }),
      update: expect.any(Object),
    });
  });

  it('generates every expiry alert beyond the previous limit of 20', async () => {
    const items = Array.from({ length: 25 }, (_, index) => ({
      id: `item-${index}`,
      expiryDate: new Date(),
      Product: { name: `Produit ${index}` },
    }));
    prisma.inventoryItem.findMany.mockResolvedValue(items);
    prisma.budget.findFirst.mockResolvedValue(null);
    prisma.notification.findUnique.mockResolvedValue(null);
    prisma.notification.upsert.mockImplementation(({ create }) =>
      Promise.resolve(create),
    );

    await service.synchronizeExpiryNotifications('user-1');

    expect(prisma.notification.upsert).toHaveBeenCalledTimes(25);
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it('lists and counts notifications without synchronizing business data', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.notification.count.mockResolvedValue(0);

    await service.listNotifications('user-1');
    await service.countUnread('user-1');

    expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
    expect(prisma.budget.findFirst).not.toHaveBeenCalled();
    expect(prisma.notification.upsert).not.toHaveBeenCalled();
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        isRead: false,
        resolvedAt: null,
        dismissedAt: null,
      },
      orderBy: [{ lastOccurredAt: 'desc' }, { id: 'desc' }],
      take: 51,
    });
  });

  it('returns an opaque cursor and the total unread count', async () => {
    const notifications = [
      {
        id: 'notification-3',
        lastOccurredAt: new Date('2026-07-28T12:00:00.000Z'),
      },
      {
        id: 'notification-2',
        lastOccurredAt: new Date('2026-07-28T11:00:00.000Z'),
      },
      {
        id: 'notification-1',
        lastOccurredAt: new Date('2026-07-28T10:00:00.000Z'),
      },
    ];
    prisma.notification.findMany.mockResolvedValue(notifications);
    prisma.notification.count.mockResolvedValue(73);

    const page = await service.listNotifications('user-1', {
      includeRead: true,
      limit: 2,
    });

    expect(page.items).toEqual(notifications.slice(0, 2));
    expect(page.hasNextPage).toBe(true);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(page.unreadCount).toBe(73);

    prisma.notification.findMany.mockResolvedValue([]);
    await service.listNotifications('user-1', {
      includeRead: true,
      limit: 2,
      cursor: page.nextCursor!,
    });

    expect(prisma.notification.findMany).toHaveBeenLastCalledWith({
      where: {
        userId: 'user-1',
        resolvedAt: null,
        dismissedAt: null,
        OR: [
          {
            lastOccurredAt: {
              lt: new Date('2026-07-28T11:00:00.000Z'),
            },
          },
          {
            lastOccurredAt: new Date('2026-07-28T11:00:00.000Z'),
            id: { lt: 'notification-2' },
          },
        ],
      },
      orderBy: [{ lastOccurredAt: 'desc' }, { id: 'desc' }],
      take: 3,
    });
  });

  it('updates an existing notification without marking it unread again', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        expiryDate: new Date(),
        Product: { name: 'Yaourt nature' },
      },
    ]);
    prisma.budget.findFirst.mockResolvedValue(null);
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notification-1',
      title: 'Produit à consommer très vite',
      isRead: true,
      resolvedAt: null,
    });
    prisma.notification.upsert.mockResolvedValue({
      id: 'notification-1',
      isRead: true,
    });
    prisma.notification.count.mockResolvedValue(0);

    await service.synchronizeUser('user-1');

    expect(prisma.notification.upsert).toHaveBeenCalledWith({
      where: { deduplicationKey: expect.any(String) },
      create: expect.any(Object),
      update: expect.not.objectContaining({ isRead: expect.anything() }),
    });
  });

  it('marks an existing notification unread when its severity changes', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        expiryDate: new Date(),
        Product: { name: 'Yaourt nature' },
      },
    ]);
    prisma.budget.findFirst.mockResolvedValue(null);
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notification-1',
      title: 'Produit bientôt périmé',
      isRead: true,
      resolvedAt: null,
    });
    prisma.notification.upsert.mockResolvedValue({
      id: 'notification-1',
      isRead: false,
    });
    prisma.notification.count.mockResolvedValue(1);

    await service.synchronizeUser('user-1');

    expect(prisma.notification.upsert).toHaveBeenCalledWith({
      where: { deduplicationKey: expect.any(String) },
      create: expect.any(Object),
      update: expect.objectContaining({ isRead: false }),
    });
  });

  it('uses one stable key for concurrent creations of the same alert', async () => {
    const storedNotifications = new Map<string, unknown>();
    prisma.notification.findUnique.mockResolvedValue(null);
    prisma.notification.upsert.mockImplementation(({ where, create }) => {
      const key = where.deduplicationKey;
      if (!storedNotifications.has(key)) {
        storedNotifications.set(key, create);
      }
      return Promise.resolve(storedNotifications.get(key));
    });
    const input = {
      userId: 'user-1',
      type: 'EXPIRY',
      title: 'Produit bientôt périmé',
      message: 'Le lait expire bientôt.',
      referenceId: 'item-1',
      referenceType: 'inventory_item',
    };

    await Promise.all([
      (service as any).createOrUpdateNotification(input),
      (service as any).createOrUpdateNotification(input),
    ]);

    expect(storedNotifications.size).toBe(1);
    expect(prisma.notification.upsert).toHaveBeenCalledTimes(2);
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

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        isRead: false,
        resolvedAt: null,
        dismissedAt: null,
      },
      data: { isRead: true, updatedAt: expect.any(Date) },
    });
  });

  it('dismisses an active notification', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
      userId: 'user-1',
      resolvedAt: null,
    });
    prisma.notification.update.mockResolvedValue({
      id: 'notification-1',
      isRead: true,
      dismissedAt: new Date(),
    });

    await expect(
      service.dismiss('user-1', 'notification-1'),
    ).resolves.toMatchObject({
      id: 'notification-1',
      isRead: true,
    });

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: {
        dismissedAt: expect.any(Date),
        isRead: true,
        updatedAt: expect.any(Date),
      },
    });
  });

  it('resolves expiry notifications whose inventory item is gone', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([]);
    prisma.budget.findFirst.mockResolvedValue(null);
    prisma.notification.findMany.mockResolvedValueOnce([
      {
        id: 'notification-1',
        referenceId: 'deleted-item',
        referenceType: 'inventory_item',
      },
    ]);
    prisma.notification.count.mockResolvedValue(0);

    await service.synchronizeUser('user-1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['notification-1'] }, userId: 'user-1' },
      data: {
        resolvedAt: expect.any(Date),
        isRead: true,
        updatedAt: expect.any(Date),
      },
    });
  });
});
