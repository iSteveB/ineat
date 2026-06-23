import { BadRequestException } from '@nestjs/common';
import { UsageType } from '../../../prisma/generated/prisma/client';
import {
  GeneratedRecipeTypeDto,
  RecipeGenerationModeDto,
} from '../dto/generate-recipes.dto';
import { RecipeService } from './recipe.service';

const user = {
  id: 'user-1',
  role: 'USER',
  subscriptionPlan: 'PREMIUM',
  subscriptionStatus: 'ACTIVE',
  trialStartedAt: null,
  trialEndsAt: null,
  currentPeriodStartedAt: null,
  currentPeriodEndsAt: null,
  preferences: { diets: [], allergens: [] },
};

const inventoryItems = [
  {
    productId: 'product-apple',
    Product: {
      name: 'Pommes',
      Category: { name: 'Fruits' },
    },
  },
  {
    productId: 'product-yogurt',
    Product: {
      name: 'Yaourt nature',
      Category: { name: 'Produits laitiers' },
    },
  },
];

const baseGeneratedRecipe = {
  clientId: 'recipe-1',
  type: GeneratedRecipeTypeDto.STARTER,
  name: 'Velouté de pommes',
  description: 'Une entrée simple.',
  preparationTime: 10,
  cookingTime: 15,
  servings: 2,
  difficulty: 'EASY' as const,
  ingredients: [
    {
      name: 'Pommes',
      quantity: 2,
      unit: 'unités',
      source: 'INVENTORY' as const,
      productId: 'product-apple',
    },
    {
      name: 'Sel',
      quantity: null,
      unit: null,
      source: 'BASIC' as const,
      productId: null,
    },
  ],
  basicIngredients: ['sel'],
  missingIngredients: [],
  steps: ['Couper les pommes.', 'Cuire puis mixer.'],
};

describe('RecipeService', () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    inventoryItem: { findMany: jest.Mock };
  };
  let usageQuotaService: {
    assertCanConsume: jest.Mock;
    recordSuccessfulUsage: jest.Mock;
  };
  let openAiRecipeService: {
    generateRecipes: jest.Mock;
    generateRecipeImage: jest.Mock;
  };
  let service: RecipeService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      inventoryItem: { findMany: jest.fn().mockResolvedValue(inventoryItems) },
    };
    usageQuotaService = {
      assertCanConsume: jest.fn().mockResolvedValue({ remaining: 5 }),
      recordSuccessfulUsage: jest.fn().mockResolvedValue({ remaining: 4 }),
    };
    openAiRecipeService = {
      generateRecipes: jest.fn(),
      generateRecipeImage: jest.fn(),
    };
    service = new RecipeService(
      prisma as any,
      usageQuotaService as any,
      openAiRecipeService as any,
      {} as any,
    );
  });

  it('génère une recette par catégorie demandée et consomme le quota après validation', async () => {
    openAiRecipeService.generateRecipes.mockResolvedValue([
      baseGeneratedRecipe,
      {
        ...baseGeneratedRecipe,
        clientId: 'recipe-2',
        type: GeneratedRecipeTypeDto.DESSERT,
        name: 'Pommes au yaourt',
        ingredients: [
          {
            name: 'Yaourt nature',
            quantity: 1,
            unit: 'pot',
            source: 'INVENTORY' as const,
            productId: 'product-yogurt',
          },
        ],
      },
    ]);

    const result = await service.generate('user-1', {
      types: [GeneratedRecipeTypeDto.STARTER, GeneratedRecipeTypeDto.DESSERT],
      servings: 2,
      mode: RecipeGenerationModeDto.FLEXIBLE,
      extraIngredientLimit: 2,
    });

    expect(result.data.recipes).toHaveLength(2);
    expect(usageQuotaService.assertCanConsume).toHaveBeenCalledWith(
      user,
      UsageType.AI_RECIPE_GENERATION,
    );
    expect(usageQuotaService.recordSuccessfulUsage).toHaveBeenCalledWith(
      user,
      UsageType.AI_RECIPE_GENERATION,
    );
  });

  it('rejette une recette stricte contenant un ingrédient manquant', async () => {
    openAiRecipeService.generateRecipes.mockResolvedValue([
      {
        ...baseGeneratedRecipe,
        ingredients: [
          ...baseGeneratedRecipe.ingredients,
          {
            name: 'Crème',
            quantity: 20,
            unit: 'cl',
            source: 'MISSING' as const,
            productId: null,
          },
        ],
        missingIngredients: ['Crème'],
      },
    ]);

    await expect(
      service.generate('user-1', {
        types: [GeneratedRecipeTypeDto.STARTER],
        servings: 2,
        mode: RecipeGenerationModeDto.STRICT,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(usageQuotaService.recordSuccessfulUsage).not.toHaveBeenCalled();
  });

  it('rejette une génération qui duplique une catégorie demandée', async () => {
    openAiRecipeService.generateRecipes.mockResolvedValue([
      baseGeneratedRecipe,
      {
        ...baseGeneratedRecipe,
        clientId: 'recipe-2',
        name: 'Deuxième entrée',
      },
    ]);

    await expect(
      service.generate('user-1', {
        types: [GeneratedRecipeTypeDto.STARTER, GeneratedRecipeTypeDto.DESSERT],
        servings: 2,
        mode: RecipeGenerationModeDto.FLEXIBLE,
        extraIngredientLimit: 2,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(usageQuotaService.recordSuccessfulUsage).not.toHaveBeenCalled();
  });
});
