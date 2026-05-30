import { AccessPolicyService } from './access-policy.service';

describe('AccessPolicyService', () => {
  let service: AccessPolicyService;

  const now = new Date('2026-05-29T12:00:00.000Z');

  beforeEach(() => {
    service = new AccessPolicyService();
  });

  it('devrait appliquer les droits Free pour un utilisateur Free', () => {
    const policy = service.getPolicy(
      {
        role: 'USER',
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'ACTIVE',
      },
      now,
    );

    expect(policy).toEqual({
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
    });
  });

  it('devrait appliquer les droits Premium pour un utilisateur Premium actif', () => {
    const policy = service.getPolicy(
      {
        role: 'USER',
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
      },
      now,
    );

    expect(policy).toEqual({
      effectivePlan: 'PREMIUM',
      capabilities: {
        inventoryLimit: 500,
        canUseRecipes: true,
        canGenerateAiRecipes: true,
        aiRecipeGenerationRemaining: 100,
        canImportDrive: true,
        driveImportsRemaining: 25,
        canUseAutomaticBudgetSync: true,
        canAccessAdmin: false,
      },
    });
  });

  it('devrait appliquer les droits Premium pour un Trial actif', () => {
    const policy = service.getPolicy(
      {
        role: 'USER',
        subscriptionPlan: 'TRIAL',
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: '2026-05-30T12:00:00.000Z',
      },
      now,
    );

    expect(policy).toEqual({
      effectivePlan: 'PREMIUM',
      capabilities: {
        inventoryLimit: 500,
        canUseRecipes: true,
        canGenerateAiRecipes: true,
        aiRecipeGenerationRemaining: 10,
        canImportDrive: true,
        driveImportsRemaining: 3,
        canUseAutomaticBudgetSync: true,
        canAccessAdmin: false,
      },
    });
  });

  it('devrait appliquer les droits Free pour un Trial expiré', () => {
    const policy = service.getPolicy(
      {
        role: 'USER',
        subscriptionPlan: 'TRIAL',
        subscriptionStatus: 'EXPIRED',
        trialEndsAt: '2026-05-28T12:00:00.000Z',
      },
      now,
    );

    expect(policy.effectivePlan).toBe('FREE');
    expect(policy.capabilities).toMatchObject({
      inventoryLimit: 50,
      canUseRecipes: false,
      canGenerateAiRecipes: false,
      aiRecipeGenerationRemaining: 0,
      canImportDrive: false,
      driveImportsRemaining: 0,
      canUseAutomaticBudgetSync: false,
      canAccessAdmin: false,
    });
  });

  it('devrait appliquer les droits Free pour un Trial actif avec date dépassée', () => {
    const policy = service.getPolicy(
      {
        role: 'USER',
        subscriptionPlan: 'TRIAL',
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: '2026-05-28T12:00:00.000Z',
      },
      now,
    );

    expect(policy.effectivePlan).toBe('FREE');
    expect(policy.capabilities.canUseRecipes).toBe(false);
  });

  it('ne devrait pas donner de bypass produit à un Admin Free', () => {
    const policy = service.getPolicy(
      {
        role: 'ADMIN',
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'ACTIVE',
      },
      now,
    );

    expect(policy).toEqual({
      effectivePlan: 'FREE',
      capabilities: {
        inventoryLimit: 50,
        canUseRecipes: false,
        canGenerateAiRecipes: false,
        aiRecipeGenerationRemaining: 0,
        canImportDrive: false,
        driveImportsRemaining: 0,
        canUseAutomaticBudgetSync: false,
        canAccessAdmin: true,
      },
    });
  });

  it('devrait conserver les droits admin et Premium pour un Admin Premium', () => {
    const policy = service.getPolicy(
      {
        role: 'ADMIN',
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
      },
      now,
    );

    expect(policy.effectivePlan).toBe('PREMIUM');
    expect(policy.capabilities.canAccessAdmin).toBe(true);
    expect(policy.capabilities.canUseRecipes).toBe(true);
  });
});
