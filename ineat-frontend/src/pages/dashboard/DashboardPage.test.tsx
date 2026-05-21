import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardPage from './DashboardPage';
import { inventoryService } from '@/services/inventoryService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

vi.mock('@/services/inventoryService', () => ({
	inventoryService: {
		getInventory: vi.fn(),
		getRecentProducts: vi.fn(),
	},
}));

vi.mock('@/features/inventory/InventoryWidget', () => ({
	InventoryWidget: () => <section data-testid='inventory-widget' />,
}));

vi.mock('@/features/score/ScoreWidget', () => ({
	default: ({ inventory }: { inventory: unknown[] }) => (
		<section data-testid='score-widget'>{inventory.length}</section>
	),
}));

vi.mock('@/features/budget/BudgetWidget', () => ({
	BudgetWidget: () => <section data-testid='budget-widget' />,
}));

vi.mock('@/features/product/RecentProductsWidget', () => ({
	RecentProductsWidget: ({ products }: { products: unknown[] }) => (
		<section data-testid='recent-products-widget'>{products.length}</section>
	),
}));

vi.mock('@/features/product/ExpiringProductsWidget', () => ({
	ExpiringProductsWidget: ({ products }: { products: unknown[] }) => (
		<section data-testid='expiring-products-widget'>{products.length}</section>
	),
}));

const renderDashboard = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<DashboardPage />
		</QueryClientProvider>
	);
};

describe('DashboardPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: { firstName: 'Camille' },
		});
	});

	it('affiche les widgets avec inventaire, budget, récents et produits à expirer', async () => {
		(inventoryService.getInventory as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce([{ id: 'item-1' }, { id: 'item-2' }])
			.mockResolvedValueOnce([{ id: 'expiring-1' }]);
		(inventoryService.getRecentProducts as ReturnType<typeof vi.fn>).mockResolvedValue([
			{ id: 'recent-1' },
			{ id: 'recent-2' },
			{ id: 'recent-3' },
		]);

		renderDashboard();

		await waitFor(() => {
			expect(screen.getByText('Bonjour Camille,')).toBeInTheDocument();
		});

		expect(screen.getByTestId('inventory-widget')).toBeInTheDocument();
		expect(screen.getByTestId('budget-widget')).toBeInTheDocument();
		expect(screen.getByTestId('score-widget')).toHaveTextContent('2');
		expect(screen.getByTestId('recent-products-widget')).toHaveTextContent(
			'3'
		);
		expect(screen.getByTestId('expiring-products-widget')).toHaveTextContent(
			'1'
		);
		expect(inventoryService.getRecentProducts).toHaveBeenCalledWith(5);
		expect(inventoryService.getInventory).toHaveBeenCalledWith({
			expiringWithinDays: 7,
		});
	});

	it('affiche un état d’erreur lorsque le dashboard ne peut pas charger', async () => {
		(inventoryService.getInventory as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error('API indisponible')
		);
		(inventoryService.getRecentProducts as ReturnType<typeof vi.fn>).mockResolvedValue(
			[]
		);

		renderDashboard();

		await waitFor(() => {
			expect(
				screen.getByText(
					'Impossible de charger les données du tableau de bord.'
				)
			).toBeInTheDocument();
		});
		expect(screen.getByText('API indisponible')).toBeInTheDocument();
	});
});
