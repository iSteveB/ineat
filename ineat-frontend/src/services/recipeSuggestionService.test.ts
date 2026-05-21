import { describe, expect, it } from 'vitest';

import { buildRecipeSuggestions } from './recipeSuggestionService';
import type { InventoryItem } from '@/schemas';

const baseItem = {
	userId: '22222222-2222-4222-8222-222222222222',
	purchaseDate: '2026-05-20T00:00:00.000Z',
	createdAt: '2026-05-20T10:00:00.000Z',
	updatedAt: '2026-05-20T10:00:00.000Z',
	quantity: 1,
	product: {
		id: '33333333-3333-4333-8333-333333333333',
		name: 'Produit',
		unitType: 'UNIT',
		createdAt: '2026-05-20T10:00:00.000Z',
		updatedAt: '2026-05-20T10:00:00.000Z',
		category: {
			id: '44444444-4444-4444-8444-444444444444',
			name: 'Epicerie',
			slug: 'epicerie',
		},
	},
} satisfies Partial<InventoryItem>;

function item(
	id: string,
	name: string,
	expiryDate?: string,
	category = 'epicerie'
): InventoryItem {
	return {
		...baseItem,
		id,
		expiryDate,
		product: {
			...baseItem.product,
			id: `${id}-product`,
			name,
			category: {
				...baseItem.product.category,
				name: category,
				slug: category,
			},
		},
	} as InventoryItem;
}

describe('buildRecipeSuggestions', () => {
	it('priorise les recettes utilisant un produit proche de péremption', () => {
		const suggestions = buildRecipeSuggestions([
			item('item-1', 'Oeufs bio', '2026-05-22T00:00:00.000Z'),
			item('item-2', 'Fromage râpé', '2026-06-10T00:00:00.000Z'),
			item('item-3', 'Riz basmati', '2026-07-10T00:00:00.000Z'),
		]);

		expect(suggestions[0].id).toBe('omelette-anti-gaspi');
		expect(suggestions[0].priorityIngredients).toContain('Oeufs bio');
	});

	it('affiche les ingrédients manquants pour une recette actionnable', () => {
		const suggestions = buildRecipeSuggestions([
			item('item-1', 'Pâtes complètes'),
			item('item-2', 'Tomates fraîches'),
			item('item-3', 'Yaourt nature'),
		]);
		const pasta = suggestions.find(
			(suggestion) => suggestion.id === 'pates-legumes'
		);

		expect(pasta).toBeDefined();
		expect(pasta?.usedIngredients.map((ingredient) => ingredient.name)).toEqual(
			expect.arrayContaining(['Pâtes complètes', 'Tomates fraîches'])
		);
		expect(pasta?.missingIngredients.length).toBeLessThanOrEqual(2);
	});

	it("retourne un état vide quand l'inventaire est insuffisant", () => {
		expect(buildRecipeSuggestions([item('item-1', 'Yaourt nature')])).toEqual(
			[]
		);
	});
});
