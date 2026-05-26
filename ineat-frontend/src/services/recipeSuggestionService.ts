import type { InventoryItem } from '@/schemas';
import { inventoryService } from './inventoryService';

type RecipeTemplate = {
	id: string;
	name: string;
	description: string;
	required: string[];
	optional: string[];
	preparationTime: number;
	cookingTime: number;
	servings: number;
	difficulty: 'EASY' | 'MEDIUM' | 'HARD';
	tags: string[];
	steps: string[];
};

export type RecipeSuggestion = {
	id: string;
	name: string;
	description: string;
	matchScore: number;
	preparationTime: number;
	cookingTime: number;
	totalTime: number;
	servings: number;
	difficulty: 'EASY' | 'MEDIUM' | 'HARD';
	tags: string[];
	usedIngredients: Array<{
		inventoryItemId: string;
		name: string;
		quantityAvailable: number;
		expiryDate?: string | null;
		daysUntilExpiry?: number;
	}>;
	missingIngredients: string[];
	priorityIngredients: string[];
	steps: string[];
};

const templates: RecipeTemplate[] = [
	{
		id: 'omelette-anti-gaspi',
		name: 'Omelette anti-gaspi',
		description:
			'Une base rapide pour utiliser oeufs, fromage et légumes en fin de vie.',
		required: ['oeuf', 'egg'],
		optional: ['fromage', 'cheese', 'tomate', 'courgette', 'poivron', 'champignon', 'légume', 'legume'],
		preparationTime: 8,
		cookingTime: 8,
		servings: 2,
		difficulty: 'EASY',
		tags: ['rapide', 'anti-gaspi', 'protéiné'],
		steps: [
			'Battre les oeufs avec sel et poivre.',
			'Faire revenir les légumes disponibles quelques minutes.',
			'Ajouter les oeufs, cuire à feu doux, puis finir avec le fromage.',
		],
	},
	{
		id: 'pates-legumes',
		name: 'Pâtes aux légumes du stock',
		description:
			'Un plat simple pour écouler légumes, sauce tomate et fromage.',
		required: ['pâte', 'pates', 'pasta', 'spaghetti'],
		optional: ['tomate', 'courgette', 'poivron', 'oignon', 'fromage', 'légume', 'legume'],
		preparationTime: 10,
		cookingTime: 15,
		servings: 3,
		difficulty: 'EASY',
		tags: ['familial', 'économique'],
		steps: [
			'Cuire les pâtes dans une eau salée.',
			'Faire sauter les légumes coupés avec un filet d’huile.',
			'Mélanger avec les pâtes et ajouter fromage ou herbes si disponibles.',
		],
	},
	{
		id: 'riz-saute',
		name: 'Riz sauté express',
		description:
			'Une option flexible pour utiliser riz, oeufs et légumes restants.',
		required: ['riz', 'rice'],
		optional: ['oeuf', 'egg', 'carotte', 'petit pois', 'poivron', 'oignon', 'poulet', 'légume', 'legume'],
		preparationTime: 10,
		cookingTime: 12,
		servings: 2,
		difficulty: 'EASY',
		tags: ['rapide', 'restes'],
		steps: [
			'Réchauffer le riz dans une poêle chaude.',
			'Ajouter les légumes et protéines disponibles.',
			'Assaisonner puis servir dès que l’ensemble est bien chaud.',
		],
	},
	{
		id: 'soupe-legumes',
		name: 'Soupe de légumes prioritaires',
		description:
			'Une soupe utile quand plusieurs légumes approchent de la péremption.',
		required: ['carotte', 'poireau', 'courgette', 'pomme de terre', 'légume', 'legume'],
		optional: ['oignon', 'crème', 'creme', 'fromage', 'pain'],
		preparationTime: 15,
		cookingTime: 25,
		servings: 4,
		difficulty: 'EASY',
		tags: ['anti-gaspi', 'batch'],
		steps: [
			'Couper les légumes disponibles en morceaux réguliers.',
			'Couvrir d’eau, saler, puis cuire jusqu’à tendreté.',
			'Mixer et ajuster la texture avec crème ou fromage si disponibles.',
		],
	},
	{
		id: 'salade-composee',
		name: 'Salade composée',
		description:
			'Une assiette froide pour assembler crudités, féculents et protéines.',
		required: ['salade', 'tomate', 'concombre', 'crudité', 'crudite'],
		optional: ['oeuf', 'thon', 'fromage', 'riz', 'pâte', 'mais', 'maïs'],
		preparationTime: 12,
		cookingTime: 0,
		servings: 2,
		difficulty: 'EASY',
		tags: ['frais', 'sans cuisson'],
		steps: [
			'Laver et couper les crudités disponibles.',
			'Ajouter une base plus rassasiante si disponible.',
			'Assaisonner juste avant de servir.',
		],
	},
	{
		id: 'yaourt-fruits',
		name: 'Bol yaourt et fruits',
		description:
			'Un dessert ou petit déjeuner pour utiliser fruits et produits laitiers.',
		required: ['yaourt', 'yogurt', 'fromage blanc'],
		optional: ['banane', 'pomme', 'fraise', 'fruit', 'miel', 'céréale', 'cereale'],
		preparationTime: 5,
		cookingTime: 0,
		servings: 1,
		difficulty: 'EASY',
		tags: ['petit-déjeuner', 'sans cuisson'],
		steps: [
			'Verser le yaourt dans un bol.',
			'Ajouter les fruits coupés.',
			'Compléter avec miel ou céréales si disponibles.',
		],
	},
];

export const recipeSuggestionService = {
	async getSuggestions(): Promise<RecipeSuggestion[]> {
		const inventory = await inventoryService.getInventory();
		return buildRecipeSuggestions(inventory);
	},

	async getSuggestionById(recipeId: string): Promise<RecipeSuggestion | null> {
		const suggestions = await this.getSuggestions();
		return suggestions.find((suggestion) => suggestion.id === recipeId) ?? null;
	},
};

export function buildRecipeSuggestions(
	inventory: InventoryItem[]
): RecipeSuggestion[] {
	const usableInventory = inventory.filter((item) => item.product);

	if (usableInventory.length < 2) {
		return [];
	}

	return templates
		.map((template) => buildSuggestion(template, usableInventory))
		.filter((suggestion): suggestion is RecipeSuggestion => Boolean(suggestion))
		.sort((left, right) => {
			const priorityDiff =
				right.priorityIngredients.length - left.priorityIngredients.length;
			if (priorityDiff !== 0) return priorityDiff;
			return right.matchScore - left.matchScore;
		})
		.slice(0, 6);
}

function buildSuggestion(
	template: RecipeTemplate,
	inventory: InventoryItem[]
): RecipeSuggestion | null {
	const requiredMatches = matchKeywords(template.required, inventory);
	const optionalMatches = matchKeywords(template.optional, inventory);
	const usedIngredientMap = new Map<string, InventoryItem>();

	for (const item of [...requiredMatches, ...optionalMatches]) {
		usedIngredientMap.set(item.id, item);
	}

	const missingRequired = template.required.filter(
		(keyword) => !inventory.some((item) => itemMatchesKeyword(item, keyword))
	);
	const missingIngredients = missingRequired.slice(0, 3);

	if (requiredMatches.length === 0 || missingIngredients.length > 2) {
		return null;
	}

	const usedIngredients = [...usedIngredientMap.values()];
	const priorityIngredients = usedIngredients.filter((item) => {
		const days = daysUntilExpiry(item.expiryDate);
		return days !== undefined && days <= 5;
	});
	const ingredientCount = template.required.length + template.optional.length;
	const matchScore = Math.min(
		100,
		Math.round(
			(usedIngredients.length / ingredientCount) * 80 +
				priorityIngredients.length * 10
		)
	);

	return {
		id: template.id,
		name: template.name,
		description: template.description,
		matchScore,
		preparationTime: template.preparationTime,
		cookingTime: template.cookingTime,
		totalTime: template.preparationTime + template.cookingTime,
		servings: template.servings,
		difficulty: template.difficulty,
		tags: template.tags,
		usedIngredients: usedIngredients.map((item) => ({
			inventoryItemId: item.id,
			name: item.product.name,
			quantityAvailable: item.quantity,
			expiryDate: item.expiryDate,
			daysUntilExpiry: daysUntilExpiry(item.expiryDate),
		})),
		missingIngredients,
		priorityIngredients: priorityIngredients.map((item) => item.product.name),
		steps: template.steps,
	};
}

function matchKeywords(
	keywords: string[],
	inventory: InventoryItem[]
): InventoryItem[] {
	return inventory.filter((item) =>
		keywords.some((keyword) => itemMatchesKeyword(item, keyword))
	);
}

function itemMatchesKeyword(item: InventoryItem, keyword: string): boolean {
	const normalizedKeyword = normalize(keyword);
	const searchableParts = [
		item.product.name,
		item.product.brand,
		item.product.category?.name,
		item.product.category?.slug,
		item.notes,
	].filter(Boolean);

	return searchableParts.some((part) =>
		normalize(String(part)).includes(normalizedKeyword)
	);
}

function daysUntilExpiry(expiryDate?: string | null): number | undefined {
	if (!expiryDate) {
		return undefined;
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const expiry = new Date(expiryDate);
	expiry.setHours(0, 0, 0, 0);

	return Math.ceil(
		(expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
	);
}

function normalize(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}
