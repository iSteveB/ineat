import { BetterAuthSessionService } from './better-auth-session.service';

const getSession = jest.fn();
jest.mock('../../lib/auth', () => ({
  auth: { api: { getSession } },
}));

describe('BetterAuthSessionService', () => {
  const request = { headers: {} } as never;
  const activeUser = {
    id: 'user-id',
    email: 'user@example.com',
    accountStatus: 'ACTIVE',
    suspendedUntil: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getSession.mockResolvedValue({
      user: { id: 'user-id' },
      session: { id: 'session-id' },
    });
  });

  it.each(['SUSPENDED', 'BANNED', 'PENDING_DELETION', 'ANONYMIZED'])(
    'refuse une session pour un compte %s',
    async (accountStatus) => {
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            ...activeUser,
            accountStatus,
          }),
          update: jest.fn(),
        },
      };
      const service = new BetterAuthSessionService(prisma as never);

      await expect(service.getAuthenticatedUser(request)).resolves.toBeNull();
    },
  );

  it('réactive automatiquement une suspension arrivée à échéance', async () => {
    const reactivated = { ...activeUser, accountStatus: 'ACTIVE' };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...activeUser,
          accountStatus: 'SUSPENDED',
          suspendedUntil: new Date('2020-01-01T00:00:00.000Z'),
        }),
        update: jest.fn().mockResolvedValue(reactivated),
      },
    };
    const service = new BetterAuthSessionService(prisma as never);

    await expect(service.getAuthenticatedUser(request)).resolves.toEqual(
      expect.objectContaining({ id: 'user-id', authSessionId: 'session-id' }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountStatus: 'ACTIVE' }),
      }),
    );
  });
});
