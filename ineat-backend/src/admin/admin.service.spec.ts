import { Test, TestingModule } from '@nestjs/testing';
import {
  SubscriptionPlan,
  UserRole,
} from '../../prisma/generated/prisma/enums';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';
import { QueueMonitoringService } from '../jobs/queue-monitoring.service';
import { AdminAuditService } from './admin-audit.service';
import { BadRequestException } from '@nestjs/common';
import { AccessPolicyService } from '../auth/services/access-policy.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    user: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    invoice: { count: jest.Mock };
    notificationDelivery: { count: jest.Mock };
    stripeWebhookEvent: { count: jest.Mock };
    usageEvent: { count: jest.Mock };
  };
  let adminAuditService: { record: jest.Mock };

  const actor = {
    userId: 'b412cf43-92d0-4f41-9690-d2a861477201',
    sessionId: 'session-id',
    ipAddress: '127.0.0.1',
  };

  const baseUser = {
    id: 'c6a6ed22-6d12-4d5b-85ac-2dbadf8f8ce1',
    email: 'admin@example.com',
    firstName: 'Ada',
    lastName: 'Admin',
    role: UserRole.USER,
    subscriptionPlan: SubscriptionPlan.FREE,
    subscriptionStatus: 'ACTIVE',
    trialStartedAt: null,
    trialEndsAt: null,
    currentPeriodStartedAt: null,
    currentPeriodEndsAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    UsageQuota: [],
    sessions: [],
    _count: {
      InventoryItem: 0,
      Invoice: 0,
      Recipe: 0,
    },
  };

  afterEach(() => jest.useRealTimers());

  beforeEach(async () => {
    const user = {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    };
    prisma = {
      $transaction: jest.fn((input) =>
        typeof input === 'function' ? input({ user }) : Promise.all(input),
      ),
      $queryRaw: jest.fn().mockResolvedValue([]),
      user,
      invoice: { count: jest.fn() },
      notificationDelivery: { count: jest.fn() },
      stripeWebhookEvent: { count: jest.fn() },
      usageEvent: { count: jest.fn() },
    };
    adminAuditService = { record: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ObservabilityService,
          useValue: {
            getSnapshot: jest
              .fn()
              .mockReturnValue({ events: [], counters: {} }),
          },
        },
        {
          provide: QueueMonitoringService,
          useValue: {
            getSnapshot: jest.fn().mockResolvedValue({
              health: 'healthy',
              queues: [],
            }),
          },
        },
        {
          provide: AdminAuditService,
          useValue: adminAuditService,
        },
        {
          provide: AccessPolicyService,
          useValue: {
            getEffectivePlan: jest.fn().mockReturnValue('FREE'),
          },
        },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  it('met à jour le rôle sans modifier le plan', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    prisma.user.update.mockResolvedValue({
      ...baseUser,
      role: UserRole.ADMIN,
      subscriptionPlan: SubscriptionPlan.FREE,
    });

    const result = await service.updateUserRole(
      baseUser.id,
      UserRole.ADMIN,
      'Support utilisateur',
      actor,
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: baseUser.id },
        data: { role: UserRole.ADMIN },
      }),
    );
    expect(result.data.role).toBe(UserRole.ADMIN);
    expect(result.data.subscriptionPlan).toBe(SubscriptionPlan.FREE);
    expect(adminAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        ...actor,
        action: 'USER_ROLE_UPDATED',
        resourceId: baseUser.id,
        reason: 'Support utilisateur',
      }),
      expect.any(Object),
    );
  });

  it('calcule les métriques de dashboard sur une période bornée', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T12:00:00.000Z'));
    prisma.user.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(70)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(14)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    prisma.invoice.count
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(4);
    prisma.notificationDelivery.count.mockResolvedValue(2);
    prisma.stripeWebhookEvent.count.mockResolvedValue(1);
    prisma.usageEvent.count
      .mockResolvedValueOnce(18)
      .mockResolvedValueOnce(6);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        { date: new Date('2026-07-29T00:00:00.000Z'), count: 2 },
      ])
      .mockResolvedValueOnce([
        {
          date: new Date('2026-07-29T00:00:00.000Z'),
          count: 3,
          trials: 2,
          conversions: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          date: new Date('2026-07-29T00:00:00.000Z'),
          count: 5,
          successes: 4,
          failures: 1,
        },
      ]);

    const result = await service.getDashboard({ period: '7d' });

    expect(result.data.period).toEqual({
      key: '7d',
      from: '2026-07-23T12:00:00.000Z',
      to: '2026-07-30T12:00:00.000Z',
    });
    expect(result.data.users).toEqual(
      expect.objectContaining({ active: 40, new: 14, growthRate: 100 }),
    );
    expect(result.data.subscriptions).toEqual(
      expect.objectContaining({ conversions: 3, conversionRate: 30 }),
    );
    expect(result.data.usage).toEqual(
      expect.objectContaining({
        invoicesProcessed: 25,
        aiGenerations: 18,
        driveImports: 6,
        historyStatus: 'TRACKED_FROM_USAGE_EVENTS',
      }),
    );
    expect(result.data.trends.registrations).toEqual([
      { date: '2026-07-29', value: 2 },
    ]);
  });

  it('pagine et filtre la liste des utilisateurs côté serveur', async () => {
    prisma.user.findMany.mockResolvedValue([baseUser]);
    prisma.user.count.mockResolvedValue(26);
    const query = Object.assign(new AdminUsersQueryDto(), {
      page: 2,
      pageSize: 10,
      search: ' ada ',
      role: UserRole.USER,
      sort: 'email' as const,
      order: 'asc' as const,
    });

    const result = await service.listUsers(query);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: { email: 'asc' },
        where: expect.objectContaining({
          role: UserRole.USER,
          OR: expect.arrayContaining([
            { email: { contains: 'ada', mode: 'insensitive' } },
          ]),
        }),
        include: expect.objectContaining({
          sessions: expect.objectContaining({
            take: 1,
            select: { updatedAt: true },
          }),
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
        id: baseUser.id,
        effectivePlan: 'FREE',
        counts: { inventoryItems: 0, invoices: 0, recipes: 0 },
      }),
    );
  });

  it('met à jour le plan sans modifier le rôle', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    prisma.user.update.mockResolvedValue({
      ...baseUser,
      role: UserRole.USER,
      subscriptionPlan: SubscriptionPlan.PREMIUM,
    });

    const result = await service.updateSubscriptionPlan(
      baseUser.id,
      SubscriptionPlan.PREMIUM,
      'Accès exceptionnel',
      actor,
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: baseUser.id },
        data: { subscriptionPlan: SubscriptionPlan.PREMIUM },
      }),
    );
    expect(result.data.role).toBe(UserRole.USER);
    expect(result.data.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
    expect(adminAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_SUBSCRIPTION_PLAN_UPDATED',
        previousValue: { subscriptionPlan: SubscriptionPlan.FREE },
        newValue: { subscriptionPlan: SubscriptionPlan.PREMIUM },
      }),
      expect.any(Object),
    );
  });

  it('refuse de rétrograder le dernier administrateur', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      role: UserRole.ADMIN,
    });
    prisma.user.count.mockResolvedValue(0);

    await expect(
      service.updateUserRole(
        baseUser.id,
        UserRole.USER,
        'Rétrogradation',
        actor,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(adminAuditService.record).not.toHaveBeenCalled();
  });

  it('n’audite pas une mutation qui échoue', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    prisma.user.update.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.updateSubscriptionPlan(
        baseUser.id,
        SubscriptionPlan.PREMIUM,
        'Support utilisateur',
        actor,
      ),
    ).rejects.toThrow('database unavailable');

    expect(adminAuditService.record).not.toHaveBeenCalled();
  });
});
