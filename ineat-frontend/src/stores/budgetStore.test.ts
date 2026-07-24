import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';

import { budgetService, BudgetWithStats } from '@/services/budgetService';

let useBudgetStore: typeof import('./budgetStore').useBudgetStore;

const makeBudgetData = (id: string, month: string): BudgetWithStats => ({
	budget: {
		id,
		userId: '22222222-2222-4222-8222-222222222222',
		amount: 450,
		periodStart: `${month}-01T00:00:00.000Z`,
		periodEnd: `${month}-28T23:59:59.999Z`,
		isActive: false,
		createdAt: `${month}-01T00:00:00.000Z`,
		updatedAt: `${month}-28T23:59:59.999Z`,
	},
	stats: {
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
	},
	alerts: [],
	expenses: [],
});

const deferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((resolver) => {
		resolve = resolver;
	});
	return { promise, resolve };
};

describe('budgetStore historical selection', () => {
	beforeAll(async () => {
		const values = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
			removeItem: (key: string) => values.delete(key),
			clear: () => values.clear(),
		});
		({ useBudgetStore } = await import('./budgetStore'));
	});

	beforeEach(() => {
		useBudgetStore.getState().resetBudgetStore();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(() => {
		vi.unstubAllGlobals();
	});

	it('loads a historical month without replacing the dashboard current budget', async () => {
		const current = makeBudgetData(
			'11111111-1111-4111-8111-111111111111',
			'2026-07'
		).budget;
		const april = makeBudgetData(
			'33333333-3333-4333-8333-333333333333',
			'2026-04'
		);
		useBudgetStore.setState({ currentBudget: current });
		vi.spyOn(budgetService, 'getBudgetByMonth').mockResolvedValue(april);

		useBudgetStore.getState().setSelectedMonth('2026-04');
		await vi.waitFor(() => {
			expect(useBudgetStore.getState().isLoading).toBe(false);
		});

		expect(useBudgetStore.getState().selectedBudget?.id).toBe(
			april.budget?.id
		);
		expect(useBudgetStore.getState().currentBudget?.id).toBe(current?.id);
	});

	it('ignores a stale response after the user selects another month', async () => {
		const marchRequest = deferred<BudgetWithStats | null>();
		const aprilRequest = deferred<BudgetWithStats | null>();
		vi.spyOn(budgetService, 'getBudgetByMonth').mockImplementation((month) =>
			month === '2026-03' ? marchRequest.promise : aprilRequest.promise
		);

		useBudgetStore.getState().setSelectedMonth('2026-03');
		useBudgetStore.getState().setSelectedMonth('2026-04');
		aprilRequest.resolve(
			makeBudgetData('44444444-4444-4444-8444-444444444444', '2026-04')
		);
		await vi.waitFor(() => {
			expect(useBudgetStore.getState().isLoading).toBe(false);
		});
		marchRequest.resolve(
			makeBudgetData('55555555-5555-4555-8555-555555555555', '2026-03')
		);

		await vi.waitFor(() => {
			expect(useBudgetStore.getState().selectedBudget?.id).toBe(
				'44444444-4444-4444-8444-444444444444'
			);
		});
	});
});
