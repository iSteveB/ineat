import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecipeSuggestionsPage } from './RecipeSuggestionsPage';
import { useInventory } from '@/hooks/useInventory';
import {
	GeneratedRecipe,
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
		params?: Record<string, string>;
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

vi.mock('@/hooks/useInventory', () => ({
	useInventory: vi.fn(),
}));

vi.mock('@/services/recipeService', () => ({
	recipeService: {
		generateRecipes: vi.fn(),
		saveGeneratedRecipe: vi.fn(),
		listSavedRecipes: vi.fn(),
	},
}));

const refreshProfile = vi.fn();

const starterRecipe: GeneratedRecipe = {
	clientId: 'starter-1',
	type: 'STARTER',
	name: 'Houmous citronné',
	description: 'Un houmous frais à partir du placard.',
	preparationTime: 10,
	cookingTime: 0,
	servings: 2,
	difficulty: 'EASY',
	ingredients: [
		{
			name: 'Pois chiches',
			source: 'INVENTORY',
			productId: 'product-1',
		},
		{ name: 'Sel', source: 'BASIC' },
	],
	basicIngredients: ['sel'],
	missingIngredients: [],
	steps: ['Mixer les pois chiches.', 'Assaisonner.'],
};

const dessertRecipe: GeneratedRecipe = {
	clientId: 'dessert-1',
	type: 'DESSERT',
	name: 'Mousse banane cacao',
	description: 'Un dessert rapide avec un ingrédient à compléter.',
	preparationTime: 15,
	cookingTime: 0,
	servings: 2,
	difficulty: 'EASY',
	ingredients: [
		{
			name: 'Banane',
			source: 'INVENTORY',
			productId: 'product-2',
		},
		{ name: 'Cacao', source: 'MISSING' },
	],
	basicIngredients: [],
	missingIngredients: ['cacao'],
	steps: ['Écraser la banane.', 'Ajouter le cacao.'],
};

const savedRecipe: SavedRecipe = {
	id: 'recipe-1',
	name: 'Houmous citronné',
	description: starterRecipe.description,
	type: 'STARTER',
	typeLabel: 'Entrée',
	preparationTime: 10,
	cookingTime: 0,
	totalTime: 10,
	servings: 2,
	difficulty: 'EASY',
	imageUrl: 'https://example.com/houmous.png',
	source: 'AI',
	basicIngredients: ['sel'],
	missingIngredients: [],
	steps: starterRecipe.steps,
	doneAt: null,
	createdAt: '2026-06-23T08:00:00.000Z',
	updatedAt: '2026-06-23T08:00:00.000Z',
	ingredients: [],
};

function renderRecipeSuggestions() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<RecipeSuggestionsPage />
		</QueryClientProvider>
	);
}

describe('RecipeSuggestionsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
			(selector: (state: unknown) => unknown) =>
				selector({
					user: {
						capabilities: {
							canUseRecipes: true,
							canGenerateAiRecipes: true,
							aiRecipeGenerationRemaining: 5,
						},
					},
					getProfile: refreshProfile,
				})
		);
		(useInventory as ReturnType<typeof vi.fn>).mockReturnValue({
			data: [
				{ id: 'inventory-1', product: { id: 'product-1', name: 'Pois chiches' } },
				{ id: 'inventory-2', product: { id: 'product-2', name: 'Banane' } },
			],
		});
		(recipeService.listSavedRecipes as ReturnType<typeof vi.fn>).mockResolvedValue(
			[]
		);
	});

	it('génère en mode avec largesse puis permet de drop ou garder une proposition', async () => {
		const user = userEvent.setup();
		(recipeService.generateRecipes as ReturnType<typeof vi.fn>).mockResolvedValue({
			recipes: [starterRecipe, dessertRecipe],
			quota: { remaining: 4, limit: 5, usedCount: 1 },
		});
		(
			recipeService.saveGeneratedRecipe as ReturnType<typeof vi.fn>
		).mockResolvedValue(savedRecipe);

		renderRecipeSuggestions();

		await user.click(screen.getByRole('button', { name: /entrée/i }));
		await user.click(screen.getByRole('button', { name: /plat/i }));
		await user.click(screen.getByRole('button', { name: /dessert/i }));
		await user.click(screen.getByRole('button', { name: /avec largesse/i }));
		fireEvent.change(screen.getByLabelText(/ingrédients en plus autorisés/i), {
			target: { value: '5' },
		});
		await user.click(screen.getByRole('button', { name: /générer/i }));

		await waitFor(() => {
			expect(recipeService.generateRecipes).toHaveBeenCalledWith({
				types: ['STARTER', 'DESSERT'],
				servings: 2,
				mode: 'FLEXIBLE',
				extraIngredientLimit: 5,
			});
		});
		expect(refreshProfile).toHaveBeenCalled();
		expect(screen.getByText('Houmous citronné')).toBeInTheDocument();
		expect(screen.getByText('Mousse banane cacao')).toBeInTheDocument();

		await user.click(screen.getAllByRole('button', { name: /drop/i })[1]);
		expect(screen.queryByText('Mousse banane cacao')).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /garder/i }));

		await waitFor(() => {
			expect(recipeService.saveGeneratedRecipe).toHaveBeenCalledWith(
				starterRecipe
			);
		});
		expect(screen.queryByText('Houmous citronné')).not.toBeInTheDocument();
	});

	it('bloque la génération quand le quota quotidien est épuisé', () => {
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
			(selector: (state: unknown) => unknown) =>
				selector({
					user: {
						capabilities: {
							canUseRecipes: true,
							canGenerateAiRecipes: true,
							aiRecipeGenerationRemaining: 0,
						},
					},
					getProfile: refreshProfile,
				})
		);

		renderRecipeSuggestions();

		expect(
			screen.getByText('Vous avez utilisé vos 5 générations du jour.')
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /générer/i })).toBeDisabled();
	});
});
