import { apiClient } from '@/lib/api-client';
import {
	Budget,
	CreateBudgetData,
	UpdateBudgetData,
	BudgetStats,
	BudgetFilters,
	Expense,
	CreateExpenseData,
	BudgetAlert,
} from '@/schemas';

import {
	RawBudgetApiData,
	safeFormatBudgetPeriod,
	formatCurrency,
	getMonthString,
	parseMonthString,
	transformBudgetFromApi,
	isValidBudget,
} from '@/schemas/budget';

export interface BudgetWithStats {
	budget: Budget | null;
	stats: BudgetStats | null;
	alerts: BudgetAlert[];
	expenses: Expense[];
}

export interface BudgetExistsResponse {
	exists: boolean;
	currentBudget?: Budget;
}

export interface CreateMonthlyBudgetData {
	amount: number;
	periodStart: string;
	periodEnd: string;
	isActive: boolean;
}

export const budgetService = {
	async getCurrentBudget(): Promise<BudgetWithStats> {
		try {
			const response = await apiClient.get<BudgetWithStats>(
				'/budget/current'
			);

			let budgetData: Budget | null,
				statsData: BudgetStats | null,
				alertsData: BudgetAlert[],
				expensesData: Expense[] = [];

			if (response && typeof response === 'object') {
				if ('data' in response && response.data) {
					const responseData = response.data as BudgetWithStats;
					budgetData = responseData.budget;
					statsData = responseData.stats;
					alertsData = responseData.alerts;
					expensesData = responseData.expenses || [];
				} else {
					budgetData = (response as BudgetWithStats).budget;
					statsData = (response as BudgetWithStats).stats;
					alertsData = (response as BudgetWithStats).alerts;
					expensesData = (response as BudgetWithStats).expenses || [];
				}
			} else {
				budgetData = null;
				statsData = null;
				alertsData = [];
				expensesData = [];
			}

			if (budgetData && !isValidBudget(budgetData)) {
				budgetData = transformBudgetFromApi(
					budgetData as RawBudgetApiData
				);
			}

			return {
				budget: budgetData || null,
				stats: statsData || null,
				alerts: alertsData || [],
				expenses: expensesData || [],
			};
		} catch (error: unknown) {
			const err = error as { status?: number; message?: string };

			if (err.status === 404 || err.message?.includes('budget')) {
				return {
					budget: null,
					stats: null,
					alerts: [],
					expenses: [],
				};
			}

			throw error;
		}
	},

	async checkBudgetExists(): Promise<BudgetExistsResponse> {
		try {
			const response = await apiClient.get<BudgetExistsResponse>(
				'/budget/exists'
			);
			return response;
		} catch (error: unknown) {
			const err = error as { status?: number };

			if (err.status === 404) {
				return { exists: false };
			}

			return { exists: false };
		}
	},

	async createMonthlyBudget(amount: number): Promise<Budget> {
		const today = new Date();
		const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
		const endOfMonth = new Date(
			today.getFullYear(),
			today.getMonth() + 1,
			0
		);

		const budgetData: CreateMonthlyBudgetData = {
			amount,
			periodStart: startOfMonth.toISOString().split('T')[0],
			periodEnd: endOfMonth.toISOString().split('T')[0],
			isActive: true,
		};

		const newBudget = await apiClient.post<Budget>('/budget', budgetData);

		if (newBudget && !isValidBudget(newBudget)) {
			const transformedBudget = transformBudgetFromApi(
				newBudget as RawBudgetApiData
			);
			if (!transformedBudget) {
				throw new Error('Impossible de transformer le budget créé');
			}
			return transformedBudget;
		}

		return newBudget;
	},

	async getBudgetByMonth(month: string): Promise<Budget | null> {
		try {
			const budget = await apiClient.get<Budget>(
				`/budget/month/${month}`
			);

			if (budget && !isValidBudget(budget)) {
				return transformBudgetFromApi(budget as RawBudgetApiData);
			}

			return budget;
		} catch (error: unknown) {
			const err = error as { status?: number };
			if (err.status === 404) {
				return null;
			}
			return null;
		}
	},

	async getBudgetHistory(): Promise<Budget[]> {
		try {
			const history = await apiClient.get<Budget[]>('/budget/history');

			return history
				.map((budget) => {
					if (!isValidBudget(budget)) {
						const transformed = transformBudgetFromApi(
							budget as RawBudgetApiData
						);
						return transformed;
					}
					return budget;
				})
				.filter((budget): budget is Budget => budget !== null);
		} catch {
			return [];
		}
	},

	async createBudget(budgetData: CreateBudgetData): Promise<Budget> {
		const newBudget = await apiClient.post<Budget>('/budget', budgetData);

		if (newBudget && !isValidBudget(newBudget)) {
			const transformedBudget = transformBudgetFromApi(
				newBudget as RawBudgetApiData
			);
			if (!transformedBudget) {
				throw new Error('Impossible de transformer le budget créé');
			}
			return transformedBudget;
		}

		return newBudget;
	},

	async updateBudget(
		budgetId: string,
		updateData: UpdateBudgetData
	): Promise<Budget> {
		const updatedBudget = await apiClient.put<Budget>(
			`/budget/${budgetId}`,
			updateData
		);

		return updatedBudget;
	},

	async deleteBudget(budgetId: string): Promise<void> {
		return await apiClient.delete<void>(`/budget/${budgetId}`);
	},

	async getBudgets(filters?: BudgetFilters): Promise<Budget[]> {
		const params = new URLSearchParams();

		if (filters?.isActive !== undefined) {
			params.append('isActive', filters.isActive.toString());
		}
		if (filters?.dateRange?.startDate) {
			params.append('startDate', filters.dateRange.startDate);
		}
		if (filters?.dateRange?.endDate) {
			params.append('endDate', filters.dateRange.endDate);
		}

		const queryString = params.toString();
		const endpoint = `/budget${queryString ? `?${queryString}` : ''}`;

		try {
			const budgets = await apiClient.get<Budget[]>(endpoint);

			return budgets
				.map((budget) => {
					if (!isValidBudget(budget)) {
						const transformed = transformBudgetFromApi(
							budget as RawBudgetApiData
						);
						return transformed;
					}
					return budget;
				})
				.filter((budget): budget is Budget => budget !== null);
		} catch {
			return [];
		}
	},

	async getBudgetStats(budgetId: string): Promise<BudgetStats> {
		return await apiClient.get<BudgetStats>(`/budget/${budgetId}/stats`);
	},

	async addExpense(expenseData: CreateExpenseData): Promise<Expense> {
		return await apiClient.post<Expense>('/expense', expenseData);
	},

	async updateExpense(
		expenseId: string,
		updates: Partial<CreateExpenseData>
	): Promise<Expense> {
		return await apiClient.put<Expense>(`/expense/${expenseId}`, updates);
	},

	async deleteExpense(expenseId: string): Promise<void> {
		return await apiClient.delete<void>(`/expense/${expenseId}`);
	},

	async getBudgetAlerts(budgetId: string): Promise<BudgetAlert[]> {
		try {
			const alerts = await apiClient.get<BudgetAlert[]>(
				`/budget/${budgetId}/alerts`
			);
			return alerts;
		} catch {
			return [];
		}
	},

	async markAlertAsRead(alertId: string): Promise<void> {
		return await apiClient.patch<void>(`/budget/alert/${alertId}/read`);
	},

	async deleteAlert(alertId: string): Promise<void> {
		return await apiClient.delete<void>(`/budget/alert/${alertId}`);
	},

	periodsOverlap(
		start1: string,
		end1: string,
		start2: string,
		end2: string
	): boolean {
		const s1 = new Date(start1);
		const e1 = new Date(end1);
		const s2 = new Date(start2);
		const e2 = new Date(end2);

		return s1 <= e2 && s2 <= e1;
	},

	formatBudgetPeriod(budget: Budget): string {
		return safeFormatBudgetPeriod(budget);
	},

	formatCurrency(amount: number): string {
		return formatCurrency(amount);
	},

	calculateBudgetDuration(budget: Budget): number {
		if (!isValidBudget(budget)) {
			return 0;
		}

		const start = new Date(budget.periodStart);
		const end = new Date(budget.periodEnd);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	},

	getCurrentMonthString(): string {
		return getMonthString();
	},

	parseMonthString(monthString: string): Date {
		return parseMonthString(monthString);
	},
};
