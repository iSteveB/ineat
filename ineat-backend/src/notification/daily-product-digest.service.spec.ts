import { DailyProductDigestService } from './daily-product-digest.service';

describe('DailyProductDigestService', () => {
  const prisma = {
    user: { findMany: jest.fn() },
    inventoryItem: { findMany: jest.fn() },
    notification: { findFirst: jest.fn() },
    emailDigestDelivery: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const email = { sendDailyProductDigest: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DAILY_DIGEST_HOUR;
    prisma.user.findMany.mockResolvedValue([]);
    prisma.inventoryItem.findMany.mockResolvedValue([]);
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.emailDigestDelivery.findUnique.mockResolvedValue(null);
    prisma.emailDigestDelivery.create.mockResolvedValue({ id: 'delivery-1' });
    prisma.emailDigestDelivery.update.mockResolvedValue({ id: 'delivery-1' });
    email.sendDailyProductDigest.mockResolvedValue({ messageId: 'resend-1' });
  });

  it('sends urgent items at 08:00 in the user time zone', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Ada',
        preferences: { timeZone: 'Europe/Paris' },
      },
    ]);
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        quantity: 1,
        expiryDate: new Date('2026-08-03T12:00:00.000Z'),
        Product: { name: 'Yaourt' },
      },
    ]);
    const service = new DailyProductDigestService(prisma as any, email as any);

    await service.sendDueDigests(new Date('2026-08-03T06:10:00.000Z'));

    expect(email.sendDailyProductDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        periodKey: '2026-08-03',
        totalUrgentItems: 1,
      }),
    );
  });

  it('sends a newly occurred budget alert even without urgent items', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'user-1',
        email: 'user@example.com',
        firstName: '',
        preferences: {},
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue({
      message: 'Vous avez atteint 90 % de votre budget.',
    });
    const service = new DailyProductDigestService(prisma as any, email as any);

    await service.sendDueDigests(new Date('2026-08-03T06:10:00.000Z'));

    expect(email.sendDailyProductDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetAlert: 'Vous avez atteint 90 % de votre budget.',
      }),
    );
  });

  it('skips empty content and periods already sent', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'empty',
        email: 'empty@example.com',
        firstName: '',
        preferences: {},
      },
    ]);
    const service = new DailyProductDigestService(prisma as any, email as any);
    await service.sendDueDigests(new Date('2026-08-03T06:10:00.000Z'));
    expect(email.sendDailyProductDigest).not.toHaveBeenCalled();

    jest.clearAllMocks();
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: 'sent',
        email: 'sent@example.com',
        firstName: '',
        preferences: {},
      },
    ]);
    prisma.emailDigestDelivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      status: 'SENT',
    });
    await service.sendDueDigests(new Date('2026-08-03T06:10:00.000Z'));
    expect(prisma.inventoryItem.findMany).not.toHaveBeenCalled();
  });
});
