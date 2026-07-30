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

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    $transaction: jest.Mock;
    user: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
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
  };

  beforeEach(async () => {
    const user = {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    };
    prisma = {
      $transaction: jest.fn((callback) => callback({ user })),
      user,
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
