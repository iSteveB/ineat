import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Prisma,
  RecipeDifficulty,
  RecipeIngredientSource,
  RecipeSource,
  RecipeType,
  UsageType,
} from '../../../prisma/generated/prisma/client';
import { UsageQuotaService } from '../../auth/services/usage-quota.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GenerateRecipesDto,
  GeneratedRecipePayloadDto,
  RecipeGenerationModeDto,
  SaveGeneratedRecipeDto,
} from '../dto/generate-recipes.dto';
import {
  BASIC_RECIPE_INGREDIENT_SET,
  BASIC_RECIPE_INGREDIENTS,
} from '../recipe.constants';
import { OpenAiRecipeService } from './openai-recipe.service';

const TYPE_LABELS: Record<RecipeType, string> = {
  STARTER: 'entrée',
  MAIN: 'plat',
  DESSERT: 'dessert',
};

@Injectable()
export class RecipeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageQuotaService: UsageQuotaService,
    private readonly openAiRecipeService: OpenAiRecipeService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async generate(userId: string, dto: GenerateRecipesDto) {
    const user = await this.getUserForRecipe(userId);
    await this.usageQuotaService.assertCanConsume(
      user,
      UsageType.AI_RECIPE_GENERATION,
    );

    const extraIngredientLimit =
      dto.mode === RecipeGenerationModeDto.STRICT
        ? 0
        : (dto.extraIngredientLimit ?? 1);

    const inventory = await this.getInventoryIngredients(userId);
    this.validateInventoryForGeneration(dto.mode, inventory.length);

    const recipes = await this.openAiRecipeService.generateRecipes({
      types: dto.types,
      servings: dto.servings,
      mode: dto.mode,
      extraIngredientLimit,
      inventory,
      dietaryRestrictions: this.getDietaryRestrictions(user.preferences),
    });

    this.validateGeneratedRecipes(dto, recipes, inventory, extraIngredientLimit);

    const usage = await this.usageQuotaService.recordSuccessfulUsage(
      user,
      UsageType.AI_RECIPE_GENERATION,
    );

    return {
      success: true,
      data: {
        recipes,
        quota: usage,
      },
    };
  }

  async saveGeneratedRecipe(userId: string, dto: SaveGeneratedRecipeDto) {
    const recipe = dto.recipe;
    this.validateSavedGeneratedRecipe(recipe);

    let imageUrl: string | null = null;

    try {
      const image = await this.openAiRecipeService.generateRecipeImage(
        recipe.name,
      );
      imageUrl = await this.cloudinaryService.uploadImage(
        image,
        'recipes',
        `recipe_${userId}_${Date.now()}`,
      );
    } catch {
      imageUrl = null;
    }

    const savedRecipe = await this.prisma.recipe.create({
      data: {
        id: randomUUID(),
        userId,
        name: recipe.name,
        description: recipe.description ?? null,
        instructions: recipe.steps.join('\n'),
        preparationTime: recipe.preparationTime ?? null,
        cookingTime: recipe.cookingTime ?? null,
        servings: recipe.servings,
        difficulty: recipe.difficulty as RecipeDifficulty,
        type: recipe.type as RecipeType,
        source: RecipeSource.AI,
        imageUrl,
        steps: recipe.steps as Prisma.InputJsonValue,
        basicIngredients: recipe.basicIngredients as Prisma.InputJsonValue,
        missingIngredients: recipe.missingIngredients as Prisma.InputJsonValue,
        updatedAt: new Date(),
        RecipeIngredient: {
          create: recipe.ingredients.map((ingredient) => ({
            id: randomUUID(),
            productId:
              ingredient.source === 'INVENTORY'
                ? (ingredient.productId ?? undefined)
                : undefined,
            name: ingredient.name,
            quantity: ingredient.quantity ?? null,
            unit: ingredient.unit ?? '',
            source: ingredient.source as RecipeIngredientSource,
          })),
        },
      },
      include: this.recipeInclude(),
    });

    return {
      success: true,
      data: this.formatRecipe(savedRecipe),
      message: imageUrl
        ? 'Recette sauvegardée'
        : "Recette sauvegardée sans image pour l'instant",
    };
  }

  async listSavedRecipes(userId: string) {
    const recipes = await this.prisma.recipe.findMany({
      where: { userId },
      include: this.recipeInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: recipes.map((recipe) => this.formatRecipe(recipe)),
    };
  }

  async getSavedRecipe(userId: string, recipeId: string) {
    const recipe = await this.findUserRecipe(userId, recipeId);

    return {
      success: true,
      data: this.formatRecipe(recipe),
    };
  }

  async getCompletionPreview(userId: string, recipeId: string) {
    const recipe = await this.findUserRecipe(userId, recipeId);
    const removableItems = await this.getRemovableInventoryItems(userId, recipe);

    return {
      success: true,
      data: {
        recipeId,
        items: removableItems.map((item) => ({
          inventoryItemId: item.id,
          productId: item.productId,
          name: item.Product.name,
        })),
      },
    };
  }

  async completeRecipe(userId: string, recipeId: string, confirm: boolean) {
    if (!confirm) {
      throw new BadRequestException('Confirmation requise');
    }

    const recipe = await this.findUserRecipe(userId, recipeId);
    const removableItems = await this.getRemovableInventoryItems(userId, recipe);
    const removableIds = removableItems.map((item) => item.id);

    const updatedRecipe = await this.prisma.$transaction(async (tx) => {
      if (removableIds.length > 0) {
        await tx.inventoryItem.deleteMany({
          where: {
            userId,
            id: { in: removableIds },
          },
        });
      }

      return tx.recipe.update({
        where: { id: recipeId },
        data: {
          doneAt: new Date(),
          updatedAt: new Date(),
        },
        include: this.recipeInclude(),
      });
    });

    return {
      success: true,
      data: {
        recipe: this.formatRecipe(updatedRecipe),
        removedItems: removableItems.map((item) => ({
          inventoryItemId: item.id,
          productId: item.productId,
          name: item.Product.name,
        })),
      },
    };
  }

  private async getUserForRecipe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  private async getInventoryIngredients(userId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { userId },
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
    });

    return items
      .filter((item) => item.Product?.name)
      .map((item) => ({
        productId: item.productId,
        name: item.Product.name,
        category: item.Product.Category?.name ?? null,
      }));
  }

  private validateInventoryForGeneration(
    mode: RecipeGenerationModeDto,
    inventoryCount: number,
  ) {
    if (mode === RecipeGenerationModeDto.STRICT && inventoryCount < 2) {
      throw new BadRequestException(
        'Votre inventaire est trop limité pour générer une recette en mode strict',
      );
    }

    if (mode === RecipeGenerationModeDto.FLEXIBLE && inventoryCount < 1) {
      throw new BadRequestException(
        'Ajoutez au moins un produit à votre inventaire pour générer une recette',
      );
    }
  }

  private validateGeneratedRecipes(
    request: GenerateRecipesDto,
    recipes: GeneratedRecipePayloadDto[],
    inventory: Array<{ productId: string; name: string }>,
    extraIngredientLimit: number,
  ) {
    if (recipes.length !== request.types.length) {
      throw new BadRequestException('La génération ne respecte pas la demande');
    }

    const requestedTypes = new Set(request.types);
    const generatedTypes = new Set(recipes.map((recipe) => recipe.type));
    const inventoryIds = new Set(inventory.map((item) => item.productId));

    if (generatedTypes.size !== request.types.length) {
      throw new BadRequestException(
        'La génération doit retourner une recette différente par catégorie demandée',
      );
    }

    for (const type of requestedTypes) {
      if (!generatedTypes.has(type)) {
        throw new BadRequestException(
          'La génération ne contient pas toutes les catégories demandées',
        );
      }
    }

    for (const recipe of recipes) {
      if (!requestedTypes.has(recipe.type)) {
        throw new BadRequestException('Une recette générée a un type invalide');
      }

      const missingIngredients = recipe.ingredients.filter(
        (ingredient) => ingredient.source === 'MISSING',
      );

      if (
        request.mode === RecipeGenerationModeDto.STRICT &&
        missingIngredients.length > 0
      ) {
        throw new BadRequestException(
          'Une recette stricte contient des ingrédients hors inventaire',
        );
      }

      if (missingIngredients.length > extraIngredientLimit) {
        throw new BadRequestException(
          'Une recette dépasse la limite d’ingrédients supplémentaires',
        );
      }

      for (const ingredient of recipe.ingredients) {
        if (ingredient.source === 'BASIC') {
          if (!BASIC_RECIPE_INGREDIENT_SET.has(this.normalize(ingredient.name))) {
            throw new BadRequestException('Une recette contient un basique invalide');
          }
          continue;
        }

        if (
          ingredient.source === 'INVENTORY' &&
          (!ingredient.productId || !inventoryIds.has(ingredient.productId))
        ) {
          throw new BadRequestException(
            'Une recette référence un ingrédient absent de l’inventaire',
          );
        }
      }
    }
  }

  private validateSavedGeneratedRecipe(recipe: GeneratedRecipePayloadDto) {
    if (!recipe.steps?.length || !recipe.ingredients?.length) {
      throw new BadRequestException('Recette incomplète');
    }
  }

  private async findUserRecipe(userId: string, recipeId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: {
        id: recipeId,
        userId,
      },
      include: this.recipeInclude(),
    });

    if (!recipe) {
      throw new NotFoundException('Recette introuvable');
    }

    return recipe;
  }

  private async getRemovableInventoryItems(
    userId: string,
    recipe: Awaited<ReturnType<RecipeService['findUserRecipe']>>,
  ) {
    if (recipe.doneAt) {
      throw new ForbiddenException('Cette recette a déjà été marquée comme faite');
    }

    const productIds = recipe.RecipeIngredient.filter(
      (ingredient) =>
        ingredient.source === RecipeIngredientSource.INVENTORY &&
        ingredient.productId,
    ).map((ingredient) => ingredient.productId!);

    if (productIds.length === 0) {
      return [];
    }

    return this.prisma.inventoryItem.findMany({
      where: {
        userId,
        productId: { in: [...new Set(productIds)] },
      },
      include: {
        Product: true,
      },
    });
  }

  private getDietaryRestrictions(preferences: unknown) {
    const value = preferences as { allergens?: string[]; diets?: string[] } | null;

    return {
      allergens: Array.isArray(value?.allergens) ? value.allergens : [],
      diets: Array.isArray(value?.diets) ? value.diets : [],
    };
  }

  private recipeInclude() {
    return {
      RecipeIngredient: {
        include: {
          Product: true,
        },
      },
    };
  }

  private formatRecipe(recipe: any) {
    const steps = Array.isArray(recipe.steps)
      ? recipe.steps
      : recipe.instructions.split('\n').filter(Boolean);

    return {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      type: recipe.type,
      typeLabel: TYPE_LABELS[recipe.type as RecipeType],
      preparationTime: recipe.preparationTime,
      cookingTime: recipe.cookingTime,
      totalTime: (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0),
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      imageUrl: recipe.imageUrl,
      source: recipe.source,
      basicIngredients: recipe.basicIngredients ?? [],
      missingIngredients: recipe.missingIngredients ?? [],
      steps,
      doneAt: recipe.doneAt?.toISOString() ?? null,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
      ingredients: recipe.RecipeIngredient.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        productId: ingredient.productId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        source: ingredient.source,
      })),
    };
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }
}
