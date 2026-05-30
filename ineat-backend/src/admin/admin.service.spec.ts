import { Test, TestingModule } from '@nestjs/testing';
import {
  SubscriptionPlan,
  UserRole,
} from '../../prisma/generated/prisma/enums';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    user: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
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
    prisma = {
      user: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

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
            getSnapshot: jest.fn().mockReturnValue({ events: [], counters: {} }),
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

    const result = await service.updateUserRole(baseUser.id, UserRole.ADMIN);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: baseUser.id },
        data: { role: UserRole.ADMIN },
      }),
    );
    expect(result.data.role).toBe(UserRole.ADMIN);
    expect(result.data.subscriptionPlan).toBe(SubscriptionPlan.FREE);
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
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: baseUser.id },
        data: { subscriptionPlan: SubscriptionPlan.PREMIUM },
      }),
    );
    expect(result.data.role).toBe(UserRole.USER);
    expect(result.data.subscriptionPlan).toBe(SubscriptionPlan.PREMIUM);
  });
});
