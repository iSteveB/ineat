import { apiClient } from '@/lib/api-client';
import {
	// Types Budget
	Budget,
	BudgetStats,
	BudgetAlert,
	CreateBudgetData,
	UpdateBudgetData,

	// Types Expense
	Expense,
	CreateExpenseData,

	// Types de réponses API
	BudgetExistsResponse,
	CurrentBudgetResponse,
	BudgetResponse,
	BudgetStatsResponse,
	BudgetAlertsResponse,
	ExpenseResponse,
	ExpenseListResponse,
} from '@/schemas/budget';
import { PaginationParams } from '@/schemas/common';

// ===== SERVICE BUDGET =====

export const budgetService = {
	// ===== MÉTHODES BUDGET =====

	/**
	 * GET /budget/current - Récupère le budget du mois courant avec statistiques
	 */
	async getCurrentBudget(): Promise<CurrentBudgetResponse['data']> {
		const response = await apiClient.get<CurrentBudgetResponse>(
			'/budget/current'
		);
		return response.data;
	},

	/**
	 * GET /budget/exists - Vérifie si l'utilisateur a un budget existant
	 */
	async checkBudgetExists(): Promise<boolean> {
		const response = await apiClient.get<BudgetExistsResponse>(
			'/budget/exists'
		);
		return response.data.hasAnyBudget;
	},

	/**
	 * POST /budget/monthly - Crée un budget mensuel automatique
	 */
	async createMonthlyBudget(amount: number): Promise<Budget> {
		const response = await apiClient.post<BudgetResponse>(
			'/budget/monthly',
			{ amount }
		);
		return response.data;
	},

	/**
	 * POST /budget - Crée un budget manuel avec période personnalisée
	 */
	async createBudget(budgetData: CreateBudgetData): Promise<Budget> {
		const response = await apiClient.post<BudgetResponse>(
			'/budget',
			budgetData
		);
		return response.data;
	},

	/**
	 * PUT /budget/:id - Met à jour un budget existant
	 */
	async updateBudget(
		budgetId: string,
		updateData: UpdateBudgetData
	): Promise<Budget> {
		const response = await apiClient.put<BudgetResponse>(
			`/budget/${budgetId}`,
			updateData
		);
		return response.data;
	},

	/**
	 * GET /budget/:id/stats - Récupère les statistiques détaillées d'un budget
	 */
	async getBudgetStats(budgetId: string): Promise<BudgetStats> {
		const response = await apiClient.get<BudgetStatsResponse>(
			`/budget/${budgetId}/stats`
		);
		return response.data;
	},

	/**
	 * GET /budget/:id/alerts - Récupère les alertes d'un budget
	 */
	async getBudgetAlerts(budgetId: string): Promise<BudgetAlert[]> {
		const response = await apiClient.get<BudgetAlertsResponse>(
			`/budget/${budgetId}/alerts`
		);
		return response.data;
	},

	/**
	 * DELETE /budget/:id - Supprime un budget
	 */
	async deleteBudget(budgetId: string): Promise<void> {
		await apiClient.delete(`/budget/${budgetId}`);
	},

	// ===== MÉTHODES EXPENSE =====

	/**
	 * GET /expense - Récupère la liste des dépenses avec filtres et pagination
	 */
	async getExpenses(params?: {
		budgetId?: string;
		page?: number;
		pageSize?: number;
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
	}): Promise<ExpenseListResponse['data']> {
		const searchParams = new URLSearchParams();

		if (params?.budgetId) searchParams.append('budgetId', params.budgetId);
		if (params?.page) searchParams.append('page', params.page.toString());
		if (params?.pageSize)
			searchParams.append('pageSize', params.pageSize.toString());
		if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
		if (params?.sortOrder)
			searchParams.append('sortOrder', params.sortOrder);

		const url = `/expense${
			searchParams.toString() ? `?${searchParams.toString()}` : ''
		}`;
		const response = await apiClient.get<ExpenseListResponse>(url);
		return response.data;
	},

	/**
	 * GET /expense/budget/:budgetId - Récupère les dépenses d'un budget spécifique
	 */
	async getExpensesByBudget(
		budgetId: string,
		pagination?: PaginationParams
	): Promise<ExpenseListResponse['data']> {
		const params = new URLSearchParams();

		if (pagination?.page) params.append('page', pagination.page.toString());
		if (pagination?.pageSize)
			params.append('pageSize', pagination.pageSize.toString());
		if (pagination?.sortBy) params.append('sortBy', pagination.sortBy);
		if (pagination?.sortOrder)
			params.append('sortOrder', pagination.sortOrder);

		const queryString = params.toString();
		const url = `/expense/budget/${budgetId}${
			queryString ? `?${queryString}` : ''
		}`;

		const response = await apiClient.get<ExpenseListResponse>(url);
		return response.data;
	},

	/**
	 * GET /expense/recent - Récupère les dépenses récentes (pour le dashboard)
	 */
	async getRecentExpenses(limit = 10): Promise<Expense[]> {
		const response = await apiClient.get<{
			success: true;
			data: Expense[];
		}>(`/expense/recent?limit=${limit}`);
		return response.data;
	},

	/**
	 * POST /expense - Crée une dépense manuelle
	 */
	async createExpense(expenseData: CreateExpenseData): Promise<Expense> {
		const response = await apiClient.post<ExpenseResponse>(
			'/expense',
			expenseData
		);
		return response.data;
	},

	/**
	 * PUT /expense/:id - Met à jour une dépense
	 */
	async updateExpense(
		expenseId: string,
		updateData: Partial<CreateExpenseData>
	): Promise<Expense> {
		const response = await apiClient.put<ExpenseResponse>(
			`/expense/${expenseId}`,
			updateData
		);
		return response.data;
	},

	/**
	 * DELETE /expense/:id - Supprime une dépense
	 */
	async deleteExpense(expenseId: string): Promise<void> {
		await apiClient.delete(`/expense/${expenseId}`);
	},

	/**
	 * GET /expense/without-amount - Récupère les produits sans prix
	 */
	async getExpensesWithoutAmount(budgetId?: string): Promise<Expense[]> {
		const url = budgetId
			? `/expense/without-amount?budgetId=${budgetId}`
			: '/expense/without-amount';

		const response = await apiClient.get<{
			success: true;
			data: Expense[];
		}>(url);
		return response.data;
	},

	/**
	 * POST /expense/calculate-impact - Calcule l'impact d'une dépense sur le budget
	 */
	async calculateExpenseImpact(
		amount: number,
		budgetId?: string
	): Promise<{
		currentBudget: Budget;
		projectedRemaining: number;
		wouldExceedBudget: boolean;
		suggestedAction?: string;
	}> {
		const response = await apiClient.post<{
			success: true;
			data: {
				currentBudget: Budget;
				projectedRemaining: number;
				wouldExceedBudget: boolean;
				suggestedAction?: string;
			};
		}>('/expense/calculate-impact', { amount, budgetId });
		return response.data;
	},
};

// Export par défaut
export default budgetService;
