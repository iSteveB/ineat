import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryPage from './InventoryPage';

const mocks = vi.hoisted(() => ({
	items: [] as Array<Record<string, unknown>>,
	fetchInventoryItems: vi.fn(),
	clearError: vi.fn(),
	removeInventoryItems: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
	Link: ({ children }: { children: ReactNode }) => <a href='#'>{children}</a>,
}));

vi.mock('@/stores/authStore', () => ({
	useAuthStore: () => ({
		user: {
			firstName: 'Jean',
			lastName: 'Dupont',
			capabilities: { inventoryLimit: 50 },
		},
	}),
}));

vi.mock('@/stores/inventoryStore', () => ({
	useInventoryItems: () => mocks.items,
	useInventoryLoading: () => false,
	useInventoryError: () => null,
	useInventoryActions: () => ({
		fetchInventoryItems: mocks.fetchInventoryItems,
		clearError: mocks.clearError,
		removeInventoryItems: mocks.removeInventoryItems,
	}),
}));

vi.mock('@/hooks/useCategories', () => ({
	useCategories: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/components/common/CategoryFilter', () => ({
	default: () => <div>Catégories</div>,
}));

vi.mock('@/features/product/ProductCard', () => ({
	default: ({ item }: { item: { product: { name: string } } }) => (
		<div>{item.product.name}</div>
	),
}));

const makeItem = (id: string, name: string, isFavorite: boolean) => ({
	id,
	isFavorite,
	expiryStatus: 'GOOD',
	expiryDate: '2026-12-01T00:00:00.000Z',
	purchasePrice: 2,
	product: {
		id: `product-${id}`,
		name,
		brand: null,
		category: { id: 'category-1', name: 'Frais', slug: 'frais' },
	},
});

describe('InventoryPage favorites filter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.items = [
			makeItem('item-1', 'Yaourt favori', true),
			makeItem('item-2', 'Pommes', false),
		];
	});

	it('affiche uniquement les produits favoris depuis le bouton cœur', async () => {
		const user = userEvent.setup();
		render(<InventoryPage />);

		expect(screen.getByText('Yaourt favori')).toBeInTheDocument();
		expect(screen.getByText('Pommes')).toBeInTheDocument();

		const favoriteButton = screen.getByRole('button', {
			name: 'Afficher les favoris',
		});
		expect(favoriteButton).toHaveAttribute('aria-pressed', 'false');
		await user.click(favoriteButton);

		expect(screen.getByText('Yaourt favori')).toBeInTheDocument();
		expect(screen.queryByText('Pommes')).not.toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Afficher tout l’inventaire' }),
		).toHaveAttribute('aria-pressed', 'true');
	});

	it('affiche un état vide dédié quand aucun favori n’existe', async () => {
		mocks.items = [makeItem('item-2', 'Pommes', false)];
		const user = userEvent.setup();
		render(<InventoryPage />);

		await user.click(
			screen.getByRole('button', { name: 'Afficher les favoris' }),
		);

		expect(screen.getByText('Aucun produit favori')).toBeInTheDocument();
	});
});
