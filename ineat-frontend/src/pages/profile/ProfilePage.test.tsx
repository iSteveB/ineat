import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { userService } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import ProfilePage from './ProfilePage';

vi.mock('@tanstack/react-router', () => ({
	Link: ({ to, children, ...props }: React.ComponentProps<'a'> & { to: string }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
}));

vi.mock('@/services/userService', () => ({
	userService: {
		getProfileInsights: vi.fn(),
	},
}));

vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

const user = {
	firstName: 'Camille',
	lastName: 'Martin',
	email: 'camille@example.com',
	avatarUrl: null,
	defaultServings: 3,
	primaryGoal: 'SAVE_MONEY',
	preferences: {
		allergens: ['gluten'],
		diets: ['vegetarian'],
	},
	effectivePlan: 'PREMIUM',
	capabilities: {
		aiRecipeGenerationRemaining: 8,
		driveImportsRemaining: 2,
	},
};

const renderPage = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<ProfilePage />
		</QueryClientProvider>,
	);
};

describe('ProfilePage', () => {
	beforeEach(() => {
		vi.mocked(useAuthStore).mockImplementation((selector) =>
			selector({ user } as ReturnType<typeof useAuthStore.getState>),
		);
		vi.mocked(userService.getProfileInsights).mockResolvedValue({
			recipes: { saved: 9, completed: 4 },
			spendingTrend: [
				{ month: '2026-03', total: 80 },
				{ month: '2026-04', total: 60 },
				{ month: '2026-05', total: 95 },
				{ month: '2026-06', total: 100 },
				{ month: '2026-07', total: 120 },
				{ month: '2026-08', total: 90 },
			],
		});
	});

	it('affiche les données réelles et les destinations utiles', async () => {
		renderPage();

		expect(await screen.findByText('9')).toBeInTheDocument();
		expect(screen.getByText('4')).toBeInTheDocument();
		expect(screen.getByText('Économiser')).toBeInTheDocument();
		expect(screen.getByText('Gluten')).toBeInTheDocument();
		expect(screen.getByText('Végétarien')).toBeInTheDocument();
		expect(screen.getByText('8')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();

		expect(
			screen.getByText('Recettes enregistrées').closest('a'),
		).toHaveAttribute('href', '/app/recipes');
		expect(screen.getByText('Nombre de couverts').closest('a')).toHaveAttribute(
			'href',
			'/app/settings/personal-info',
		);
		expect(screen.getByText('Allergies et régimes').closest('a')).toHaveAttribute(
			'href',
			'/app/settings/diet-restrictions',
		);
		expect(screen.getByText('Évolution des dépenses').closest('a')).toHaveAttribute(
			'href',
			'/app/budget',
		);
	});

	it('ne présente plus les anciennes statistiques fictives', async () => {
		renderPage();
		await screen.findByText('9');

		expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/réduction du gaspillage/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/nutriscore moyen/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/impact écologique/i)).not.toBeInTheDocument();
	});

	it('affiche un état vide honnête sans dépenses', async () => {
		vi.mocked(userService.getProfileInsights).mockResolvedValue({
			recipes: { saved: 0, completed: 0 },
			spendingTrend: [
				{ month: '2026-03', total: 0 },
				{ month: '2026-04', total: 0 },
				{ month: '2026-05', total: 0 },
				{ month: '2026-06', total: 0 },
				{ month: '2026-07', total: 0 },
				{ month: '2026-08', total: 0 },
			],
		});

		renderPage();

		expect(
			await screen.findByText('Aucune dépense enregistrée sur cette période.'),
		).toBeInTheDocument();
	});
});
