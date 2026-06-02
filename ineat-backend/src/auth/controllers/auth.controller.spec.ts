import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { AccessPolicyService } from '../services/access-policy.service';
import { UsageQuotaService } from '../services/usage-quota.service';
import { BetterAuthSessionService } from '../services/better-auth-session.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: AccessPolicyService,
          useValue: {},
        },
        {
          provide: UsageQuotaService,
          useValue: {},
        },
        {
          provide: BetterAuthSessionService,
          useValue: {
            getAuthenticatedUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('charge le profil utilisateur courant', async () => {
    const profile = { success: true, data: { id: 'user-id' } };
    authService.getProfile.mockResolvedValue(profile);

    await expect(
      controller.getProfile({ user: { id: 'user-id' } } as any),
    ).resolves.toEqual(profile);
    expect(authService.getProfile).toHaveBeenCalledWith('user-id');
  });
});
