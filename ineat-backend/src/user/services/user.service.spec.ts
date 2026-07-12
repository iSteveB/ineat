import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { hashPassword, verifyPassword } from '../../lib/password';

jest.mock('../../lib/password', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

describe('UserService.updatePassword', () => {
  const prisma = {
    account: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new UserService(prisma as any, {} as any, {} as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('met à jour le credential Better Auth quand le mot de passe actuel est valide', async () => {
    prisma.account.findFirst.mockResolvedValue({
      id: 'account-id',
      password: 'old-hash',
    });
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    (hashPassword as jest.Mock).mockResolvedValue('new-hash');
    prisma.account.update.mockResolvedValue({});

    await expect(
      service.updatePassword('user-id', {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    ).resolves.toEqual({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    });

    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        providerId: 'credential',
      },
      select: {
        id: true,
        password: true,
      },
    });
    expect(verifyPassword).toHaveBeenCalledWith({
      hash: 'old-hash',
      password: 'old-password',
    });
    expect(hashPassword).toHaveBeenCalledWith('new-password');
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: {
        id: 'account-id',
      },
      data: {
        password: 'new-hash',
      },
    });
  });

  it('rejette les comptes sans credential mot de passe local', async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    await expect(
      service.updatePassword('user-id', {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'PASSWORD_CREDENTIAL_NOT_FOUND',
      },
    });

    expect(verifyPassword).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(prisma.account.update).not.toHaveBeenCalled();
  });

  it('rejette les credentials sans hash de mot de passe', async () => {
    prisma.account.findFirst.mockResolvedValue({
      id: 'account-id',
      password: null,
    });

    await expect(
      service.updatePassword('user-id', {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.account.update).not.toHaveBeenCalled();
  });

  it('rejette un mot de passe actuel invalide sans modifier le hash', async () => {
    prisma.account.findFirst.mockResolvedValue({
      id: 'account-id',
      password: 'old-hash',
    });
    (verifyPassword as jest.Mock).mockResolvedValue(false);

    await expect(
      service.updatePassword('user-id', {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'INVALID_CURRENT_PASSWORD',
      },
    });

    expect(hashPassword).not.toHaveBeenCalled();
    expect(prisma.account.update).not.toHaveBeenCalled();
  });
});
