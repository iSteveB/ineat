import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BudgetPage } from './BudgetPage';

const navigate = vi.fn();
const setSelectedMonth = vi.fn();
let search: { month?: string } = {};
let budgetState: Record<string, unknown>;

vi.mock('@tanstack/react-router', () => ({
	Link: ({ children, to }: { children: ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
	useNavigate: () => navigate,
	useSearch: () => search,
}));

vi.mock('@/stores/budgetStore', () => ({
	useBudgetStore: () => budgetState,
}));

vi.mock('@/features/budget/BudgetEditor', () => ({
	default: () => <div data-testid='create-budget'>Créer un budget</div>,
}));

vi.mock('@/features/budget/EditBudgetDialog', () => ({
	default: () => <div data-testid='edit-budget'>Modifier le budget</div>,
}));

vi.mock('@/features/budget/BudgetStatsCard', () => ({
	default: () => <div data-testid='budget-stats'>Statistiques</div>,
}));

vi.mock('@/features/budget/BudgetAlert', () => ({
	default: () => <div data-testid='budget-alerts'>Alertes</div>,
}));

vi.mock('@/features/budget/ExpenseList', () => ({
	default: () => <div data-testid='expense-list'>Dépenses</div>,
}));

const budget = {
	id: '11111111-1111-4111-8111-111111111111',
	userId: '22222222-2222-4222-8222-222222222222',
	amount: 450,
	periodStart: '2026-04-01T00:00:00.000Z',
	periodEnd: '2026-04-30T23:59:59.999Z',
	isActive: false,
	createdAt: '2026-04-01T00:00:00.000Z',
	updatedAt: '2026-04-30T23:59:59.999Z',
};

const stats = {
	totalBudget: 450,
	totalSpent: 120,
	remaining: 330,
	percentageUsed: 26.67,
	projectedSpending: 120,
	daysRemaining: 0,
	averageDailySpending: 4,
	suggestedDailyBudget: 0,
	isOverBudget: false,
	isNearBudget: false,
	riskLevel: 'LOW',
	categoryBreakdown: [],
	sourceBreakdown: [],
	dailySpending: [],
};

describe('BudgetPage monthly navigation', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 6, 24, 12));
		vi.clearAllMocks();
		search = {};
		budgetState = {
			selectedBudget: budget,
			selectedBudgetStats: stats,
			selectedAlerts: [],
			selectedExpenses: [],
			isLoading: false,
			isLoadingExpenses: false,
			error: null,
			setSelectedMonth,
		};
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the current month with editing enabled and future navigation disabled', () => {
		render(<BudgetPage />);

		expect(setSelectedMonth).toHaveBeenCalledWith('2026-07');
		expect(screen.getByText('Juillet 2026')).toBeInTheDocument();
		expect(screen.getByTestId('edit-budget')).toBeInTheDocument();
		expect(screen.getByTestId('budget-alerts')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Afficher le mois suivant' })
		).toBeDisabled();
	});

	it('shows a past month read-only and navigates through the URL', () => {
		search = { month: '2026-04' };
		render(<BudgetPage />);

		expect(setSelectedMonth).toHaveBeenCalledWith('2026-04');
		expect(screen.getByText('Avril 2026')).toBeInTheDocument();
		expect(screen.queryByTestId('edit-budget')).not.toBeInTheDocument();
		expect(screen.queryByTestId('budget-alerts')).not.toBeInTheDocument();
		expect(screen.getByTestId('expense-list')).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole('button', { name: 'Afficher le mois suivant' })
		);
		expect(navigate).toHaveBeenCalledWith({
			to: '/app/budget',
			search: { month: '2026-05' },
		});
	});

	it('shows an historical empty state without offering budget creation', () => {
		search = { month: '2026-04' };
		budgetState = {
			...budgetState,
			selectedBudget: null,
			selectedBudgetStats: null,
		};

		render(<BudgetPage />);

		expect(
			screen.getByText('Aucun budget enregistré en avril 2026')
		).toBeInTheDocument();
		expect(screen.queryByTestId('create-budget')).not.toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Revenir au mois courant' })
		).toBeInTheDocument();
	});
});
