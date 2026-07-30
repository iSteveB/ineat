import { AdminAuditService } from './admin-audit.service';

describe('AdminAuditService', () => {
  const adminAuditLog = {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const prisma = {
    adminAuditLog,
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  let service: AdminAuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminAuditService(prisma as never);
  });

  it('pagine et filtre le journal côté serveur', async () => {
    adminAuditLog.findMany.mockResolvedValue([
      {
        id: 'audit-1',
        action: 'STRIPE_PROMOTION_CODE_CREATED',
        resourceType: 'STRIPE_PROMOTION_CODE',
        resourceId: 'promo-1',
        previousValue: null,
        newValue: { code: 'WELCOME20' },
        reason: 'Campagne validée',
        ipAddress: '127.0.0.1',
        sessionId: 'session-1',
        createdAt: new Date('2026-07-30T12:00:00.000Z'),
        AdminUser: {
          id: 'b412cf43-92d0-4f41-9690-d2a861477201',
          email: 'admin@example.com',
          firstName: 'Ada',
          lastName: 'Admin',
        },
      },
    ]);
    adminAuditLog.count.mockResolvedValue(26);

    const result = await service.list({
      page: 2,
      pageSize: 10,
      action: 'STRIPE_PROMOTION_CODE_CREATED',
      resourceType: 'STRIPE_PROMOTION_CODE',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.999Z',
    });

    expect(adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: expect.objectContaining({
          action: 'STRIPE_PROMOTION_CODE_CREATED',
          resourceType: 'STRIPE_PROMOTION_CODE',
          createdAt: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-31T23:59:59.999Z'),
          },
        }),
      }),
    );
    expect(result.data.pagination).toEqual({
      page: 2,
      pageSize: 10,
      totalItems: 26,
      totalPages: 3,
    });
    expect(result.data.items[0]).toEqual(
      expect.objectContaining({
        id: 'audit-1',
        createdAt: '2026-07-30T12:00:00.000Z',
        admin: expect.objectContaining({ email: 'admin@example.com' }),
      }),
    );
  });
});
