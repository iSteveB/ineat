import { WeeklyProductDigestService } from './weekly-product-digest.service';

describe('WeeklyProductDigestService', () => {
  const prisma = {
    user: { findMany: jest.fn() },
    inventoryItem: { findMany: jest.fn(), count: jest.fn() },
    budget: { findFirst: jest.fn() },
    emailDigestDelivery: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const email = { sendWeeklyProductDigest: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.inventoryItem.findMany.mockResolvedValue([]);
    prisma.inventoryItem.count.mockResolvedValue(0);
    prisma.budget.findFirst.mockResolvedValue(null);
    prisma.emailDigestDelivery.findUnique.mockResolvedValue(null);
    prisma.emailDigestDelivery.create.mockResolvedValue({ id: 'delivery-1' });
    prisma.emailDigestDelivery.update.mockResolvedValue({ id: 'delivery-1' });
    email.sendWeeklyProductDigest.mockResolvedValue({ messageId: 'resend-1' });
  });

  it('sends on Sunday at 18:00 in the user time zone', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Ada',
        preferences: { timeZone: 'Europe/Paris' },
        NotificationPreferences: { weeklyDigestEnabled: true },
      },
    ]);
    prisma.inventoryItem.findMany
      .mockResolvedValueOnce([
        {
          quantity: 2,
          expiryDate: new Date('2026-08-03T12:00:00.000Z'),
          Product: { name: 'Yaourts' },
        },
      ])
      .mockResolvedValueOnce([
        {
          quantity: 1,
          createdAt: new Date('2026-08-01T12:00:00.000Z'),
          Product: { name: 'Pommes' },
        },
      ]);
    prisma.inventoryItem.count.mockResolvedValue(1);
    const service = new WeeklyProductDigestService(
      prisma as any,
      email as any,
    );

    await service.sendDueDigests(new Date('2026-08-02T16:15:00.000Z'));

    expect(email.sendWeeklyProductDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        userId: 'user-1',
        periodKey: '2026-08-02',
        totals: expect.objectContaining({
          expiringSoon: 1,
          recentlyAdded: 1,
        }),
      }),
    );
    expect(prisma.emailDigestDelivery.create).toHaveBeenCalledTimes(1);
    expect(prisma.emailDigestDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SENT',
          providerMessageId: 'resend-1',
        }),
      }),
    );
  });

  it('does not send outside the Sunday 18:00 local window', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        firstName: '',
        preferences: { timeZone: 'Europe/Paris' },
        NotificationPreferences: null,
      },
    ]);
    const service = new WeeklyProductDigestService(
      prisma as any,
      email as any,
    );

    await service.sendDueDigests(new Date('2026-08-02T15:59:00.000Z'));

    expect(email.sendWeeklyProductDigest).not.toHaveBeenCalled();
  });

  it('respects opt-out and does not send an empty digest', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'disabled',
        email: 'disabled@example.com',
        firstName: '',
        preferences: {},
        NotificationPreferences: { weeklyDigestEnabled: false },
      },
      {
        id: 'empty',
        email: 'empty@example.com',
        firstName: '',
        preferences: {},
        NotificationPreferences: { weeklyDigestEnabled: true },
      },
    ]);
    const service = new WeeklyProductDigestService(
      prisma as any,
      email as any,
    );

    await service.sendDueDigests(new Date('2026-08-02T16:15:00.000Z'));

    expect(email.sendWeeklyProductDigest).not.toHaveBeenCalled();
  });

  it('does not resend a period already marked as sent', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        firstName: '',
        preferences: {},
        NotificationPreferences: null,
      },
    ]);
    prisma.emailDigestDelivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      status: 'SENT',
    });
    const service = new WeeklyProductDigestService(
      prisma as any,
      email as any,
    );

    await service.sendDueDigests(new Date('2026-08-02T16:15:00.000Z'));

    expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
    expect(email.sendWeeklyProductDigest).not.toHaveBeenCalled();
  });
});
