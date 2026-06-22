import { apiClient } from '@/lib/api-client';

export type RecipeType = 'STARTER' | 'MAIN' | 'DESSERT';
export type RecipeGenerationMode = 'STRICT' | 'FLEXIBLE';
export type RecipeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type RecipeIngredientSource = 'INVENTORY' | 'BASIC' | 'MISSING';

export type GeneratedRecipeIngredient = {
	name: string;
	quantity?: number | null;
	unit?: string | null;
	source: RecipeIngredientSource;
	productId?: string | null;
};

export type GeneratedRecipe = {
	clientId: string;
	type: RecipeType;
	name: string;
	description?: string | null;
	preparationTime?: number | null;
	cookingTime?: number | null;
	servings: number;
	difficulty: RecipeDifficulty;
	ingredients: GeneratedRecipeIngredient[];
	basicIngredients: string[];
	missingIngredients: string[];
	steps: string[];
};

export type SavedRecipe = {
	id: string;
	name: string;
	description?: string | null;
	type: RecipeType;
	typeLabel: string;
	preparationTime?: number | null;
	cookingTime?: number | null;
	totalTime: number;
	servings: number;
	difficulty: RecipeDifficulty;
	imageUrl?: string | null;
	source: 'AI' | 'MANUAL';
	basicIngredients: string[];
	missingIngredients: string[];
	steps: string[];
	doneAt?: string | null;
	createdAt: string;
	updatedAt: string;
	ingredients: Array<{
		id: string;
		name: string;
		productId?: string | null;
		quantity?: number | null;
		unit: string;
		source: RecipeIngredientSource;
	}>;
};

type ApiSuccess<T> = {
	success: boolean;
	message?: string;
	data: T;
};

export type GenerateRecipesInput = {
	types: RecipeType[];
	servings: number;
	mode: RecipeGenerationMode;
	extraIngredientLimit?: number;
};

export type CompletionPreview = {
	recipeId: string;
	items: Array<{
		inventoryItemId: string;
		productId: string;
		name: string;
	}>;
};

export const recipeService = {
	async generateRecipes(input: GenerateRecipesInput) {
		const response = await apiClient.post<
			ApiSuccess<{
				recipes: GeneratedRecipe[];
				quota: {
					remaining: number;
					limit: number;
					usedCount: number;
				};
			}>
		>('/recipes/generate', input, { timeoutMs: 60000 });

		return response.data;
	},

	async saveGeneratedRecipe(recipe: GeneratedRecipe) {
		const response = await apiClient.post<ApiSuccess<SavedRecipe>>(
			'/recipes',
			{ recipe },
			{ timeoutMs: 90000 }
		);

		return response.data;
	},

	async listSavedRecipes() {
		const response = await apiClient.get<ApiSuccess<SavedRecipe[]>>(
			'/recipes'
		);

		return response.data;
	},

	async getSavedRecipe(recipeId: string) {
		const response = await apiClient.get<ApiSuccess<SavedRecipe>>(
			`/recipes/${recipeId}`
		);

		return response.data;
	},

	async getCompletionPreview(recipeId: string) {
		const response = await apiClient.get<ApiSuccess<CompletionPreview>>(
			`/recipes/${recipeId}/completion-preview`
		);

		return response.data;
	},

	async completeRecipe(recipeId: string) {
		const response = await apiClient.post<
			ApiSuccess<{
				recipe: SavedRecipe;
				removedItems: CompletionPreview['items'];
			}>
		>(`/recipes/${recipeId}/complete`, { confirm: true });

		return response.data;
	},
};
