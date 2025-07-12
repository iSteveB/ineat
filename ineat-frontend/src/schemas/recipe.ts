import { z } from 'zod';
import {
	UuidSchema,
	ShortTextSchema,
	LongTextSchema,
	RecipeDifficultySchema,
	QuantitySchema,
	DietTypeSchema,
  DietType,
} from './base';
import {
	TimestampsSchema,
	ApiSuccessResponseSchema,
	PaginatedResponseSchema,
	SearchFilterSchema,
} from './common';
import { ProductSummarySchema } from './product';

// ===== SCHÉMA INGRÉDIENT DE RECETTE =====

export const RecipeIngredientSchema = z.object({
	id: UuidSchema,
	recipeId: UuidSchema,
	product: ProductSummarySchema,
	quantity: QuantitySchema,
	unit: z.string().max(20, "L'unité ne peut pas dépasser 20 caractères"),
	notes: z
		.string()
		.max(200, 'Les notes ne peuvent pas dépasser 200 caractères')
		.optional(),
	isOptional: z.boolean().default(false),
	canSubstitute: z.boolean().default(false),
	substitutes: z.array(z.string()).default([]), // Noms d'ingrédients de substitution
});

export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

// ===== SCHÉMA RECETTE PRINCIPAL =====

export const RecipeSchema = z
	.object({
		id: UuidSchema,
		name: ShortTextSchema,
		description: z
			.string()
			.max(300, 'La description ne peut pas dépasser 300 caractères')
			.optional(),
		instructions: LongTextSchema,
		preparationTime: z.coerce
			.number()
			.int()
			.min(1, 'Le temps de préparation doit être supérieur à 0')
			.max(600, 'Le temps de préparation semble trop long')
			.optional(), // en minutes
		cookingTime: z.coerce
			.number()
			.int()
			.min(1, 'Le temps de cuisson doit être supérieur à 0')
			.max(600, 'Le temps de cuisson semble trop long')
			.optional(), // en minutes
		servings: z.coerce
			.number()
			.int()
			.min(1, 'Le nombre de portions doit être supérieur à 0')
			.max(50, 'Le nombre de portions semble trop élevé'),
		difficulty: RecipeDifficultySchema,
		imageUrl: z.string().url("URL d'image invalide").optional(),
		tags: z.array(z.string()).default([]), // ex: ["rapide", "économique", "végétarien"]
		dietTypes: z.array(DietTypeSchema).default([]), // Types de régimes compatibles
		cuisine: z
			.string()
			.max(50, 'Le type de cuisine ne peut pas dépasser 50 caractères')
			.optional(), // ex: "française", "italienne"
		season: z
			.array(z.enum(['SPRING', 'SUMMER', 'AUTUMN', 'WINTER']))
			.default([]),
		totalTime: z.number().optional(), // Calculé automatiquement (preparationTime + cookingTime)

		// Informations nutritionnelles estimées
		estimatedCost: z.number().min(0).optional(),
		caloriesPerServing: z.number().min(0).optional(),

		// Métadonnées
		isPublic: z.boolean().default(false),
		authorId: UuidSchema.optional(),
		source: z
			.string()
			.max(200, 'La source ne peut pas dépasser 200 caractères')
			.optional(), // URL ou livre de cuisine

		ingredients: z.array(RecipeIngredientSchema).default([]),
	})
	.merge(TimestampsSchema);

export type Recipe = z.infer<typeof RecipeSchema>;

// Version résumée pour les listes
export const RecipeSummarySchema = RecipeSchema.pick({
	id: true,
	name: true,
	description: true,
	imageUrl: true,
	difficulty: true,
	servings: true,
	totalTime: true,
	tags: true,
	dietTypes: true,
	estimatedCost: true,
	caloriesPerServing: true,
}).extend({
	ingredientCount: z.number().int().min(0),
	availableIngredients: z.number().int().min(0), // Nombre d'ingrédients disponibles dans l'inventaire
	missingIngredients: z.number().int().min(0),
});

export type RecipeSummary = z.infer<typeof RecipeSummarySchema>;

// ===== SCHÉMAS DE CRÉATION =====

export const CreateRecipeIngredientSchema = z.object({
	productId: UuidSchema,
	quantity: QuantitySchema,
	unit: z.string().max(20, "L'unité ne peut pas dépasser 20 caractères"),
	notes: z
		.string()
		.max(200, 'Les notes ne peuvent pas dépasser 200 caractères')
		.optional(),
	isOptional: z.boolean().default(false),
	canSubstitute: z.boolean().default(false),
	substitutes: z.array(z.string()).default([]),
});

export type CreateRecipeIngredientData = z.infer<
	typeof CreateRecipeIngredientSchema
>;

export const CreateRecipeSchema = z.object({
	name: ShortTextSchema,
	description: z
		.string()
		.max(300, 'La description ne peut pas dépasser 300 caractères')
		.optional(),
	instructions: LongTextSchema,
	preparationTime: z.coerce.number().int().min(1).max(600).optional(),
	cookingTime: z.coerce.number().int().min(1).max(600).optional(),
	servings: z.coerce.number().int().min(1).max(50),
	difficulty: RecipeDifficultySchema,
	imageUrl: z.string().url("URL d'image invalide").optional(),
	tags: z.array(z.string()).default([]),
	dietTypes: z.array(DietTypeSchema).default([]),
	cuisine: z.string().max(50).optional(),
	season: z
		.array(z.enum(['SPRING', 'SUMMER', 'AUTUMN', 'WINTER']))
		.default([]),
	estimatedCost: z.number().min(0).optional(),
	caloriesPerServing: z.number().min(0).optional(),
	isPublic: z.boolean().default(false),
	source: z.string().max(200).optional(),
	ingredients: z
		.array(CreateRecipeIngredientSchema)
		.min(1, 'Au moins un ingrédient est requis'),
});

export type CreateRecipeData = z.infer<typeof CreateRecipeSchema>;

// ===== SCHÉMAS DE MISE À JOUR =====

export const UpdateRecipeSchema = CreateRecipeSchema.omit({
	ingredients: true,
}).partial();
export type UpdateRecipeData = z.infer<typeof UpdateRecipeSchema>;

export const UpdateRecipeIngredientSchema =
	CreateRecipeIngredientSchema.partial();
export type UpdateRecipeIngredientData = z.infer<
	typeof UpdateRecipeIngredientSchema
>;

// ===== SCHÉMAS DE GÉNÉRATION IA =====

export const RecipeGenerationRequestSchema = z.object({
	// Ingrédients disponibles (de l'inventaire)
	availableIngredients: z.array(
		z.object({
			productId: UuidSchema,
			name: z.string(),
			quantity: z.number(),
			unit: z.string(),
			expiryDate: z.string().datetime().optional(),
			daysUntilExpiry: z.number().optional(),
		})
	),

	// Préférences pour la génération
	preferences: z
		.object({
			maxPreparationTime: z.number().int().min(1).max(600).optional(),
			maxCookingTime: z.number().int().min(1).max(600).optional(),
			difficulty: RecipeDifficultySchema.optional(),
			servings: z.number().int().min(1).max(50).optional(),
			dietTypes: z.array(DietTypeSchema).optional(),
			cuisine: z.string().optional(),
			avoidIngredients: z.array(z.string()).optional(),
			prioritizeExpiring: z.boolean().default(true), // Prioriser les produits qui expirent bientôt
		})
		.optional(),

	// Contraintes
	maxMissingIngredients: z.number().int().min(0).max(10).default(2),
	includeSubstitutions: z.boolean().default(true),
});

export type RecipeGenerationRequest = z.infer<
	typeof RecipeGenerationRequestSchema
>;

export const GeneratedRecipeSchema = RecipeSchema.extend({
	matchScore: z.number().min(0).max(100), // Pourcentage de correspondance avec les ingrédients disponibles
	missingIngredients: z.array(
		z.object({
			name: z.string(),
			quantity: z.number(),
			unit: z.string(),
			estimatedPrice: z.number().optional(),
			whereToFind: z.string().optional(),
		})
	),
	usedIngredients: z.array(
		z.object({
			productId: UuidSchema,
			name: z.string(),
			quantityUsed: z.number(),
			quantityAvailable: z.number(),
			unit: z.string(),
		})
	),
	generationReason: z.string().optional(), // Pourquoi cette recette a été suggérée
});

export type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>;

// ===== SCHÉMAS DE FILTRAGE =====

export const RecipeFiltersSchema = z.object({
	search: SearchFilterSchema.optional(),
	difficulty: z.array(RecipeDifficultySchema).optional(),
	maxPreparationTime: z.number().int().min(1).optional(),
	maxCookingTime: z.number().int().min(1).optional(),
	maxTotalTime: z.number().int().min(1).optional(),
	servings: z
		.object({
			min: z.number().int().min(1).optional(),
			max: z.number().int().min(1).optional(),
		})
		.optional(),
	dietTypes: z.array(DietTypeSchema).optional(),
	tags: z.array(z.string()).optional(),
	cuisine: z.array(z.string()).optional(),
	season: z
		.array(z.enum(['SPRING', 'SUMMER', 'AUTUMN', 'WINTER']))
		.optional(),
	hasImage: z.boolean().optional(),
	isPublic: z.boolean().optional(),

	// Filtres basés sur l'inventaire
	onlyWithAvailableIngredients: z.boolean().optional(),
	maxMissingIngredients: z.number().int().min(0).optional(),
	prioritizeExpiring: z.boolean().optional(),
});

export type RecipeFilters = z.infer<typeof RecipeFiltersSchema>;

// ===== SCHÉMAS DE RÉPONSES API =====

export const RecipeResponseSchema = ApiSuccessResponseSchema(RecipeSchema);
export type RecipeResponse = z.infer<typeof RecipeResponseSchema>;

export const RecipeListResponseSchema = ApiSuccessResponseSchema(
	PaginatedResponseSchema(RecipeSummarySchema)
);
export type RecipeListResponse = z.infer<typeof RecipeListResponseSchema>;

export const GeneratedRecipesResponseSchema = ApiSuccessResponseSchema(
	z.array(GeneratedRecipeSchema)
);
export type GeneratedRecipesResponse = z.infer<
	typeof GeneratedRecipesResponseSchema
>;

export const RecipeSuggestionsResponseSchema = ApiSuccessResponseSchema(
	z.object({
		priorityRecipes: z.array(GeneratedRecipeSchema), // Recettes utilisant des ingrédients qui expirent bientôt
		quickRecipes: z.array(GeneratedRecipeSchema), // Recettes rapides (< 30 min)
		popularRecipes: z.array(RecipeSummarySchema), // Recettes populaires
		seasonalRecipes: z.array(RecipeSummarySchema), // Recettes de saison
	})
);
export type RecipeSuggestionsResponse = z.infer<
	typeof RecipeSuggestionsResponseSchema
>;

// ===== UTILITAIRES =====

/**
 * Calcule le temps total de préparation d'une recette
 */
export const calculateTotalTime = (recipe: {
	preparationTime?: number;
	cookingTime?: number;
}): number => {
	return (recipe.preparationTime || 0) + (recipe.cookingTime || 0);
};

/**
 * Détermine si une recette est compatible avec un régime alimentaire
 */
export const isRecipeCompatibleWithDiet = (
	recipe: Recipe,
	dietType: DietType
): boolean => {
	return (
		recipe.dietTypes.includes(dietType) ||
		recipe.dietTypes.includes('OMNIVORE')
	);
};

/**
 * Calcule le score de correspondance d'une recette avec les ingrédients disponibles
 */
export const calculateRecipeMatchScore = (
	recipe: Recipe,
	availableIngredients: { productId: string; quantity: number }[]
): number => {
	const availableIds = new Set(
		availableIngredients.map((ing) => ing.productId)
	);
	const totalIngredients = recipe.ingredients.length;
	const availableCount = recipe.ingredients.filter(
		(ing) => availableIds.has(ing.product.id) || ing.isOptional
	).length;

	return totalIngredients > 0 ? (availableCount / totalIngredients) * 100 : 0;
};

/**
 * Identifie les ingrédients manquants pour une recette
 */
export const findMissingIngredients = (
	recipe: Recipe,
	availableIngredients: {
		productId: string;
		quantity: number;
		unit: string;
	}[]
): RecipeIngredient[] => {
	const availableMap = new Map(
		availableIngredients.map((ing) => [ing.productId, ing])
	);

	return recipe.ingredients.filter((recipeIng) => {
		const available = availableMap.get(recipeIng.product.id);
		if (!available) return !recipeIng.isOptional;

		// Vérifier si la quantité est suffisante (nécessite une logique de conversion d'unités)
		return false; // Simplifié pour l'exemple
	});
};

/**
 * Génère des tags automatiques basés sur les caractéristiques de la recette
 */
export const generateAutoTags = (recipe: CreateRecipeData): string[] => {
	const tags: string[] = [];

	const totalTime = calculateTotalTime(recipe);
	if (totalTime <= 15) tags.push('ultra-rapide');
	else if (totalTime <= 30) tags.push('rapide');
	else if (totalTime >= 120) tags.push('mijotage');

	if (recipe.difficulty === 'EASY') tags.push('facile');
	if (recipe.ingredients.length <= 5) tags.push('peu-ingredients');

	if (recipe.dietTypes.includes('VEGETARIAN')) tags.push('végétarien');
	if (recipe.dietTypes.includes('VEGAN')) tags.push('vegan');

	return [...new Set([...recipe.tags, ...tags])];
};

/**
 * Estime le coût d'une recette basé sur les prix des ingrédients
 */
export const estimateRecipeCost = (
	recipe: Recipe,
	ingredientPrices: Map<string, number>
): number => {
	return recipe.ingredients.reduce((total, ingredient) => {
		const price = ingredientPrices.get(ingredient.product.id) || 0;
		return total + price * ingredient.quantity;
	}, 0);
};

/**
 * Valide qu'une recette est complète et cohérente
 */
export const validateRecipe = (
	recipe: CreateRecipeData
): { isValid: boolean; errors: string[] } => {
	const errors: string[] = [];

	if (recipe.ingredients.length === 0) {
		errors.push('Une recette doit avoir au moins un ingrédient');
	}

	if (!recipe.instructions || recipe.instructions.trim().length < 20) {
		errors.push('Les instructions doivent être plus détaillées');
	}

	const totalTime = calculateTotalTime(recipe);
	if (totalTime === 0) {
		errors.push(
			'Une recette doit avoir un temps de préparation ou de cuisson'
		);
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};
