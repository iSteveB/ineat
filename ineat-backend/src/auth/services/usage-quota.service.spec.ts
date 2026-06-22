import { ForbiddenException } from '@nestjs/common';
import { AccessPolicyService } from './access-policy.service';
import { UsageQuotaService } from './usage-quota.service';

describe('UsageQuotaService', () => {
  let service: UsageQuotaService;
  let prisma: {
    usageQuota: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  const now = new Date('2026-05-15T12:00:00.000Z');

  beforeEach(() => {
    prisma = {
      usageQuota: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    service = new UsageQuotaService(
      prisma as any,
      new AccessPolicyService(),
    );
  });

  it('devrait retourner 0 restant pour un utilisateur Free', async () => {
    const state = await service.getUsageState(
      {
        id: 'user-1',
        role: 'USER',
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'ACTIVE',
      },
      'AI_RECIPE_GENERATION',
      now,
    );

    expect(state).toMatchObject({
      limit: 0,
      usedCount: 0,
      remaining: 0,
      periodStart: null,
      periodEnd: null,
    });
    expect(prisma.usageQuota.findUnique).not.toHaveBeenCalled();
  });

  it('devrait utiliser la période quotidienne et le quota IA', async () => {
    prisma.usageQuota.findUnique.mockResolvedValue({ usedCount: 4 });

    const state = await service.getUsageState(
      {
        id: 'user-1',
        role: 'USER',
        subscriptionPlan: 'TRIAL',
        subscriptionStatus: 'ACTIVE',
        trialStartedAt: '2026-05-14T12:00:00.000Z',
        trialEndsAt: '2026-05-17T12:00:00.000Z',
      },
      'AI_RECIPE_GENERATION',
      now,
    );

    expect(state).toMatchObject({
      limit: 5,
      usedCount: 4,
      remaining: 1,
      periodStart: new Date('2026-05-15T00:00:00.000Z'),
      periodEnd: new Date('2026-05-16T00:00:00.000Z'),
    });
  });

  it('devrait utiliser le quota Drive Trial', async () => {
    const state = await service.getUsageState(
      {
        id: 'user-1',
        role: 'USER',
        subscriptionPlan: 'TRIAL',
        subscriptionStatus: 'ACTIVE',
        trialStartedAt: '2026-05-14T12:00:00.000Z',
        trialEndsAt: '2026-05-17T12:00:00.000Z',
      },
      'DRIVE_IMPORT',
      now,
    );

    expect(state.limit).toBe(3);
    expect(state.remaining).toBe(3);
  });

  it('devrait utiliser la période quotidienne et le quota IA Premium', async () => {
    prisma.usageQuota.findUnique.mockResolvedValue({ usedCount: 2 });

    const state = await service.getUsageState(
      {
        id: 'user-1',
        role: 'USER',
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
      },
      'AI_RECIPE_GENERATION',
      now,
    );

    expect(state).toMatchObject({
      limit: 5,
      usedCount: 2,
      remaining: 3,
      periodStart: new Date('2026-05-15T00:00:00.000Z'),
      periodEnd: new Date('2026-05-16T00:00:00.000Z'),
    });
  });

  it('devrait refuser une consommation quand le quota est atteint', async () => {
    prisma.usageQuota.findUnique.mockResolvedValue({ usedCount: 5 });

    await expect(
      service.assertCanConsume(
        {
          id: 'user-1',
          role: 'USER',
          subscriptionPlan: 'PREMIUM',
          subscriptionStatus: 'ACTIVE',
        },
        'AI_RECIPE_GENERATION',
        now,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('devrait incrémenter uniquement via recordSuccessfulUsage', async () => {
    prisma.usageQuota.findUnique.mockResolvedValueOnce({ usedCount: 2 });
    prisma.usageQuota.findUnique.mockResolvedValueOnce({ usedCount: 3 });

    const state = await service.recordSuccessfulUsage(
      {
        id: 'user-1',
        role: 'USER',
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
      },
      'DRIVE_IMPORT',
      now,
    );

    expect(prisma.usageQuota.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 'user-1',
          usageType: 'DRIVE_IMPORT',
          usedCount: 1,
          limit: 25,
        }),
        update: expect.objectContaining({
          usedCount: { increment: 1 },
          limit: 25,
        }),
      }),
    );
    expect(state.remaining).toBe(22);
  });
});
