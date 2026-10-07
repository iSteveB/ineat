import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductDetailPage from './ProductDetailPage';

const mocks = vi.hoisted(() => ({
	updateInventoryFavorite: vi.fn(),
	navigate: vi.fn(),
}));

const inventoryItem = {
	id: '11111111-1111-4111-8111-111111111111',
	userId: '22222222-2222-4222-8222-222222222222',
	quantity: 2,
	expiryDate: '2026-12-01T00:00:00.000Z',
	expiryDateSource: 'MANUAL',
	purchaseDate: '2026-10-01T00:00:00.000Z',
	purchasePrice: 3,
	storageLocation: 'frigo',
	createdAt: '2026-10-01T08:00:00.000Z',
	updatedAt: '2026-10-01T08:00:00.000Z',
	isFavorite: false,
	expiryStatus: 'GOOD',
	product: {
		id: '33333333-3333-4333-8333-333333333333',
		name: 'Yaourt nature',
		brand: 'Ferme locale',
		unitType: 'UNIT',
		category: {
			id: '44444444-4444-4444-8444-444444444444',
			name: 'Produits laitiers',
			slug: 'produits-laitiers',
		},
		createdAt: '2026-10-01T08:00:00.000Z',
		updatedAt: '2026-10-01T08:00:00.000Z',
	},
};

vi.mock('@tanstack/react-router', () => ({
	useParams: () => ({ productId: inventoryItem.id }),
	useNavigate: () => mocks.navigate,
}));

vi.mock('@/stores/inventoryStore', () => ({
	useInventoryItems: () => [inventoryItem],
	useInventoryLoading: () => false,
	useInventoryActions: () => ({
		fetchInventoryItems: vi.fn(),
		removeInventoryItem: vi.fn(),
		updateInventoryItem: vi.fn(),
		updateInventoryFavorite: mocks.updateInventoryFavorite,
	}),
}));

vi.mock('@/features/product/NutritionInfoCard', () => ({
	NutritionInfoCard: () => null,
}));

vi.mock('@/features/product/IngredientsCard', () => ({
	IngredientsCard: () => null,
}));

vi.mock('@/features/inventory/EditInventoryItemModal', () => ({
	EditInventoryItemModal: () => null,
}));

vi.mock('sonner', () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

describe('ProductDetailPage favorites', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.updateInventoryFavorite.mockResolvedValue(undefined);
	});

	it('branche le bouton cœur existant sur la persistance du favori', async () => {
		const user = userEvent.setup();
		render(<ProductDetailPage />);

		const favoriteButton = screen.getByRole('button', {
			name: 'Ajouter aux favoris',
		});
		expect(favoriteButton).toHaveAttribute('aria-pressed', 'false');

		await user.click(favoriteButton);

		await waitFor(() => {
			expect(mocks.updateInventoryFavorite).toHaveBeenCalledWith(
				inventoryItem.id,
				true,
			);
		});
	});
});
