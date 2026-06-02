import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ObservabilityService } from '../../observability/observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessPolicyService } from './access-policy.service';
import { AuthService } from './auth.service';
import { UsageQuotaService } from './usage-quota.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };
  const observability = {
    trackEvent: jest.fn(),
  };
  const accessPolicy = {
    getCapabilities: jest.fn().mockReturnValue([]),
  };
  const usageQuota = {
    getUsageState: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ObservabilityService,
          useValue: observability,
        },
        {
          provide: AccessPolicyService,
          useValue: accessPolicy,
        },
        {
          provide: UsageQuotaService,
          useValue: usageQuota,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('refuse un profil inexistant', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getProfile('missing-user')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(observability.trackEvent).toHaveBeenCalledWith(
      'auth.profile.not_found',
      'warn',
      'Profile user not found',
      { userId: 'missing-user' },
    );
  });
});
