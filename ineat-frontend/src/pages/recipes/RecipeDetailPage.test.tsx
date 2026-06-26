import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecipeDetailPage } from './RecipeDetailPage';
import {
	CompletionPreview,
	recipeService,
	SavedRecipe,
} from '@/services/recipeService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@tanstack/react-router', () => ({
	Link: ({
		children,
		to,
	}: {
		children: ReactNode;
		to: string;
	}) => <a href={to}>{children}</a>,
}));

vi.mock('sonner', () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

vi.mock('@/services/recipeService', () => ({
	recipeService: {
		getSavedRecipe: vi.fn(),
		getCompletionPreview: vi.fn(),
		completeRecipe: vi.fn(),
	},
}));

const recipe: SavedRecipe = {
	id: 'recipe-1',
	name: 'Riz aux petits pois',
	description: 'Un plat simple depuis l’inventaire.',
	type: 'MAIN',
	typeLabel: 'Plat',
	preparationTime: 10,
	cookingTime: 20,
	totalTime: 30,
	servings: 2,
	difficulty: 'EASY',
	imageUrl: 'https://example.com/riz.png',
	source: 'AI',
	basicIngredients: ['sel'],
	missingIngredients: [],
	steps: ['Cuire le riz.', 'Ajouter les petits pois.'],
	doneAt: null,
	createdAt: '2026-06-23T08:00:00.000Z',
	updatedAt: '2026-06-23T08:00:00.000Z',
	ingredients: [
		{
			id: 'ingredient-1',
			name: 'Riz',
			productId: 'product-1',
			quantity: 200,
			unit: 'g',
			source: 'INVENTORY',
		},
		{
			id: 'ingredient-2',
			name: 'Petits pois',
			productId: 'product-2',
			quantity: 150,
			unit: 'g',
			source: 'INVENTORY',
		},
		{
			id: 'ingredient-3',
			name: 'Sel',
			productId: null,
			quantity: null,
			unit: '',
			source: 'BASIC',
		},
	],
};

const completionPreview: CompletionPreview = {
	recipeId: 'recipe-1',
	items: [
		{
			inventoryItemId: 'inventory-1',
			productId: 'product-1',
			name: 'Riz',
		},
		{
			inventoryItemId: 'inventory-2',
			productId: 'product-2',
			name: 'Petits pois',
		},
	],
};

function renderRecipeDetail(recipeId = 'recipe-1') {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<RecipeDetailPage recipeId={recipeId} />
		</QueryClientProvider>
	);
}

describe('RecipeDetailPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
			(selector: (state: unknown) => unknown) =>
				selector({
					user: {
						capabilities: {
							canUseRecipes: true,
						},
					},
				})
		);
		(recipeService.getSavedRecipe as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(recipe)
			.mockResolvedValue({
				...recipe,
				doneAt: '2026-06-23T09:00:00.000Z',
			});
		(
			recipeService.getCompletionPreview as ReturnType<typeof vi.fn>
		).mockResolvedValue(completionPreview);
		(recipeService.completeRecipe as ReturnType<typeof vi.fn>).mockResolvedValue({
			recipe: {
				...recipe,
				doneAt: '2026-06-23T09:00:00.000Z',
			},
			removedItems: completionPreview.items,
		});
	});

	it('confirme le statut fait et retire uniquement les produits prévus', async () => {
		const user = userEvent.setup();

		renderRecipeDetail();

		expect(await screen.findByText('Riz aux petits pois')).toBeInTheDocument();
		await user.click(
			screen.getByRole('button', { name: /marquer comme fait/i })
		);

		expect(
			await screen.findByRole('dialog', {
				name: /marquer la recette comme faite/i,
			})
		).toBeInTheDocument();
		await waitFor(() => {
			expect(recipeService.getCompletionPreview).toHaveBeenCalledWith(
				'recipe-1'
			);
		});
		expect(screen.getAllByText('Riz').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Petits pois').length).toBeGreaterThan(0);
		expect(screen.queryByText('Sel')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /confirmer/i }));

		await waitFor(() => {
			expect(recipeService.completeRecipe).toHaveBeenCalledWith('recipe-1');
		});
		await waitFor(() => {
			expect(
				screen.getByRole('button', { name: /déjà fait/i })
			).toBeDisabled();
		});
		expect(
			screen.queryByRole('dialog', {
				name: /marquer la recette comme faite/i,
			})
		).not.toBeInTheDocument();
	});

	it('affiche un accès premium si les recettes ne sont pas disponibles', () => {
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
			(selector: (state: unknown) => unknown) =>
				selector({
					user: {
						capabilities: {
							canUseRecipes: false,
						},
					},
				})
		);

		renderRecipeDetail();

		expect(
			screen.getByText('Les recettes sont réservées Premium.')
		).toBeInTheDocument();
		expect(recipeService.getSavedRecipe).not.toHaveBeenCalled();
	});
});
