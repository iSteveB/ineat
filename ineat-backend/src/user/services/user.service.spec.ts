import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { hashPassword, verifyPassword } from '../../lib/password';

jest.mock('../../lib/password', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

describe('UserService.updatePassword', () => {
  const prisma = {
    $transaction: jest.fn(),
    account: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    budget: {
      deleteMany: jest.fn(),
    },
    expense: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    inventoryItem: {
      deleteMany: jest.fn(),
    },
    notification: {
      deleteMany: jest.fn(),
    },
    recipe: {
      count: jest.fn(),
    },
    user: {
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const accessPolicyService = {
    getPolicy: jest.fn().mockReturnValue({
      effectivePlan: 'FREE',
      capabilities: {
        inventoryLimit: 50,
        canUseRecipes: false,
        canGenerateAiRecipes: false,
        aiRecipeGenerationRemaining: 0,
        canImportDrive: false,
        driveImportsRemaining: 0,
        canUseAutomaticBudgetSync: false,
        canAccessAdmin: false,
      },
    }),
  };
  const usageQuotaService = {
    getUsageState: jest.fn().mockResolvedValue({ remaining: 0 }),
  };
  const billingService = {
    cancelSubscriptionImmediately: jest.fn().mockResolvedValue(undefined),
  };
  const cloudinaryService = {
    deleteResourceFromUrl: jest.fn().mockResolvedValue(undefined),
  };
  const emailService = {
    sendAccountDeleted: jest.fn().mockResolvedValue({ messageId: 'email-1' }),
  };
  const service = new UserService(
    prisma as any,
    accessPolicyService as any,
    usageQuotaService as any,
    billingService as any,
    cloudinaryService as any,
    emailService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retourne les métriques recettes et six mois de dépenses', async () => {
    prisma.recipe.count.mockResolvedValueOnce(7).mockResolvedValueOnce(3);
    prisma.expense.findMany.mockResolvedValue([
      { amount: 12.5, date: new Date('2025-12-15T12:00:00.000Z') },
      { amount: 7.55, date: new Date('2025-12-20T12:00:00.000Z') },
      { amount: 42, date: new Date('2026-02-01T00:00:00.000Z') },
    ]);

    await expect(
      service.getProfileInsights(
        'user-id',
        new Date('2026-03-18T10:00:00.000Z'),
      ),
    ).resolves.toEqual({
      success: true,
      data: {
        recipes: { saved: 7, completed: 3 },
        spendingTrend: [
          { month: '2025-10', total: 0 },
          { month: '2025-11', total: 0 },
          { month: '2025-12', total: 20.05 },
          { month: '2026-01', total: 0 },
          { month: '2026-02', total: 42 },
          { month: '2026-03', total: 0 },
        ],
      },
    });

    expect(prisma.recipe.count).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-id' },
    });
    expect(prisma.recipe.count).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-id', doneAt: { not: null } },
    });
    expect(prisma.expense.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        date: {
          gte: new Date('2025-10-01T00:00:00.000Z'),
          lt: new Date('2026-04-01T00:00:00.000Z'),
        },
      },
      select: { amount: true, date: true },
    });
  });

  it('retourne des compteurs et mois à zéro sans activité', async () => {
    prisma.recipe.count.mockResolvedValue(0);
    prisma.expense.findMany.mockResolvedValue([]);

    const response = await service.getProfileInsights(
      'new-user',
      new Date('2026-08-08T09:00:00.000Z'),
    );

    expect(response.data.recipes).toEqual({ saved: 0, completed: 0 });
    expect(response.data.spendingTrend).toEqual([
      { month: '2026-03', total: 0 },
      { month: '2026-04', total: 0 },
      { month: '2026-05', total: 0 },
      { month: '2026-06', total: 0 },
      { month: '2026-07', total: 0 },
      { month: '2026-08', total: 0 },
    ]);
  });

  it('met à jour les couverts et l’objectif principal', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'jane@example.com',
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-id',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      defaultServings: 6,
      primaryGoal: 'REDUCE_WASTE',
      role: 'USER',
      subscriptionPlan: 'FREE',
      subscriptionStatus: 'ACTIVE',
      preferences: {},
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await service.updatePersonalInfo('user-id', {
      defaultServings: 6,
      primaryGoal: 'REDUCE_WASTE',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: {
        defaultServings: 6,
        primaryGoal: 'REDUCE_WASTE',
      },
    });
  });

  it.each([0, 21, 2.5])(
    'rejette un nombre de couverts invalide : %s',
    async (value) => {
      await expect(
        service.updatePersonalInfo('user-id', { defaultServings: value }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    },
  );

  it('rejette un objectif principal inconnu', async () => {
    await expect(
      service.updatePersonalInfo('user-id', {
        primaryGoal: 'UNKNOWN' as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('préserve les autres préférences lors de la mise à jour des allergies', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      preferences: {
        allergens: ['gluten'],
        diets: ['vegetarian'],
        timeZone: 'Europe/Paris',
      },
    });
    prisma.user.update.mockResolvedValue({});

    await expect(
      service.updateDietaryRestrictions('user-id', { allergens: [] }),
    ).resolves.toMatchObject({
      data: { allergens: [], diets: ['vegetarian'] },
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: {
        preferences: {
          allergens: [],
          diets: ['vegetarian'],
          timeZone: 'Europe/Paris',
        },
      },
    });
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

  it('supprime le compte et les données utilisateur non-cascade dans une transaction', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'jane@example.com',
      firstName: 'Jane',
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/avatars/user-id.jpg',
      stripeSubscriptionId: 'sub_123',
      Invoice: [
        {
          pdfUrl:
            'https://res.cloudinary.com/demo/raw/upload/invoices/user-id/file.pdf',
        },
      ],
      Receipt: [],
      Recipe: [],
    });
    prisma.expense.deleteMany.mockReturnValue('delete-expenses');
    prisma.budget.deleteMany.mockReturnValue('delete-budgets');
    prisma.inventoryItem.deleteMany.mockReturnValue('delete-inventory');
    prisma.notification.deleteMany.mockReturnValue('delete-notifications');
    prisma.user.delete.mockReturnValue('delete-user');
    prisma.$transaction.mockResolvedValue([]);

    await expect(
      service.deleteAccount('user-id', {
        confirmation: 'SUPPRIMER DÉFINITIVEMENT MON COMPTE',
      }),
    ).resolves.toEqual({
      success: true,
      message: 'Compte supprimé avec succès',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      select: {
        id: true,
        email: true,
        firstName: true,
        avatarUrl: true,
        stripeSubscriptionId: true,
        Invoice: { select: { pdfUrl: true } },
        Receipt: { select: { imageUrl: true, pdfUrl: true } },
        Recipe: { select: { imageUrl: true } },
      },
    });
    expect(billingService.cancelSubscriptionImmediately).toHaveBeenCalledWith(
      'sub_123',
    );
    expect(prisma.expense.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
    });
    expect(prisma.budget.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
    });
    expect(prisma.inventoryItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
    });
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-id' },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      'delete-expenses',
      'delete-budgets',
      'delete-inventory',
      'delete-notifications',
      'delete-user',
    ]);
    expect(emailService.sendAccountDeleted).toHaveBeenCalledWith({
      to: 'jane@example.com',
      userId: 'user-id',
      firstName: 'Jane',
    });
  });

  it("rejette la suppression si l'utilisateur n'existe pas", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.deleteAccount('missing-user', {
        confirmation: 'SUPPRIMER DÉFINITIVEMENT MON COMPTE',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('rejette une phrase de confirmation incorrecte', async () => {
    await expect(
      service.deleteAccount('user-id', { confirmation: 'SUPPRIMER' as any }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
