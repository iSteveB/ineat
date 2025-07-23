import { apiClient } from '@/lib/api-client';
import {
	// Types Budget
	Budget,
	BudgetStats,
	BudgetAlert,
	CreateBudgetData,
	UpdateBudgetData,
	BudgetFilters,
	
	// Types Expense
	Expense,
	CreateExpenseData,
	UpdateExpenseData,
	ExpenseFilters,
	
	// Types de réponses API
	BudgetExistsResponse,
	CurrentBudgetResponse,
	BudgetResponse,
	BudgetListResponse,
	BudgetStatsResponse,
	BudgetAlertsResponse,
	ExpenseResponse,
	ExpenseListResponse,
	ProductWithBudgetImpactResponse
} from '@/schemas/budget';

	// Types utilitaires
	import { PaginationParams } from '@/schemas/common';

// ===== SERVICE BUDGET =====

export const budgetService = {
	// ===== MÉTHODES BUDGET =====

	/**
	 * Récupère le budget du mois courant avec statistiques et alertes
	 */
	async getCurrentBudget(): Promise<CurrentBudgetResponse['data']> {
		const response = await apiClient.get<CurrentBudgetResponse>('/budget/current');
		return response.data;
	},

	/**
	 * Vérifie si l'utilisateur a un budget existant
	 */
	async checkBudgetExists(): Promise<BudgetExistsResponse['data']> {
		const response = await apiClient.get<BudgetExistsResponse>('/budget/exists');
		return response.data;
	},

	/**
	 * Crée un budget manuel avec période personnalisée
	 */
	async createBudget(budgetData: CreateBudgetData): Promise<Budget> {
		const response = await apiClient.post<BudgetResponse>('/budget', budgetData);
		return response.data;
	},

	/**
	 * Crée un budget mensuel automatique (montant + auto-périodes)
	 */
	async createMonthlyBudget(amount: number): Promise<Budget> {
		const response = await apiClient.post<BudgetResponse>('/budget/monthly', { amount });
		return response.data;
	},

	/**
	 * Met à jour un budget existant
	 */
	async updateBudget(budgetId: string, updateData: UpdateBudgetData): Promise<Budget> {
		const response = await apiClient.put<BudgetResponse>(`/budget/${budgetId}`, updateData);
		return response.data;
	},

	/**
	 * Récupère les statistiques détaillées d'un budget
	 */
	async getBudgetStats(budgetId: string): Promise<BudgetStats> {
		const response = await apiClient.get<BudgetStatsResponse>(`/budget/${budgetId}/stats`);
		return response.data;
	},

	/**
	 * Récupère les alertes d'un budget
	 */
	async getBudgetAlerts(budgetId: string): Promise<BudgetAlert[]> {
		const response = await apiClient.get<BudgetAlertsResponse>(`/budget/${budgetId}/alerts`);
		return response.data;
	},

	/**
	 * Supprime un budget
	 */
	async deleteBudget(budgetId: string): Promise<void> {
		await apiClient.delete(`/budget/${budgetId}`);
	},

	/**
	 * Récupère la liste des budgets avec filtres et pagination
	 */
	async getBudgets(filters?: BudgetFilters, pagination?: PaginationParams): Promise<BudgetListResponse['data']> {
		const params = new URLSearchParams();
		
		// Ajout des filtres
		if (filters?.isActive !== undefined) {
			params.append('isActive', filters.isActive.toString());
		}
		if (filters?.dateRange?.startDate) {
			params.append('startDate', filters.dateRange.startDate);
		}
		if (filters?.dateRange?.endDate) {
			params.append('endDate', filters.dateRange.endDate);
		}
		if (filters?.amountRange?.min !== undefined) {
			params.append('minAmount', filters.amountRange.min.toString());
		}
		if (filters?.amountRange?.max !== undefined) {
			params.append('maxAmount', filters.amountRange.max.toString());
		}

		// Ajout de la pagination
		if (pagination?.page) {
			params.append('page', pagination.page.toString());
		}
		if (pagination?.pageSize) {
			params.append('pageSize', pagination.pageSize.toString());
		}
		if (pagination?.sortBy) {
			params.append('sortBy', pagination.sortBy);
		}
		if (pagination?.sortOrder) {
			params.append('sortOrder', pagination.sortOrder);
		}

		const response = await apiClient.get<BudgetListResponse>(`/budget?${params.toString()}`);
		return response.data;
	},

	// ===== MÉTHODES EXPENSE =====

	/**
	 * Récupère la liste des dépenses avec filtres et pagination
	 */
	async getExpenses(filters?: ExpenseFilters, pagination?: PaginationParams): Promise<ExpenseListResponse['data']> {
		const params = new URLSearchParams();
		
		// Ajout des filtres
		if (filters?.budgetId) {
			params.append('budgetId', filters.budgetId);
		}
		if (filters?.dateRange?.startDate) {
			params.append('startDate', filters.dateRange.startDate);
		}
		if (filters?.dateRange?.endDate) {
			params.append('endDate', filters.dateRange.endDate);
		}
		if (filters?.amountRange?.min !== undefined) {
			params.append('minAmount', filters.amountRange.min.toString());
		}
		if (filters?.amountRange?.max !== undefined) {
			params.append('maxAmount', filters.amountRange.max.toString());
		}
		if (filters?.source) {
			params.append('source', filters.source);
		}
		if (filters?.category) {
			params.append('category', filters.category);
		}
		if (filters?.hasReceipt !== undefined) {
			params.append('hasReceipt', filters.hasReceipt.toString());
		}

		// Ajout de la pagination
		if (pagination?.page) {
			params.append('page', pagination.page.toString());
		}
		if (pagination?.pageSize) {
			params.append('pageSize', pagination.pageSize.toString());
		}
		if (pagination?.sortBy) {
			params.append('sortBy', pagination.sortBy);
		}
		if (pagination?.sortOrder) {
			params.append('sortOrder', pagination.sortOrder);
		}

		const response = await apiClient.get<ExpenseListResponse>(`/expense?${params.toString()}`);
		return response.data;
	},

	/**
	 * Récupère les dépenses d'un budget spécifique
	 */
	async getExpensesByBudget(budgetId: string, pagination?: PaginationParams): Promise<ExpenseListResponse['data']> {
		const params = new URLSearchParams();
		
		if (pagination?.page) {
			params.append('page', pagination.page.toString());
		}
		if (pagination?.pageSize) {
			params.append('pageSize', pagination.pageSize.toString());
		}
		if (pagination?.sortBy) {
			params.append('sortBy', pagination.sortBy);
		}
		if (pagination?.sortOrder) {
			params.append('sortOrder', pagination.sortOrder);
		}

		const queryString = params.toString();
		const url = `/expense/budget/${budgetId}${queryString ? `?${queryString}` : ''}`;
		
		const response = await apiClient.get<ExpenseListResponse>(url);
		return response.data;
	},

	/**
	 * Récupère les dépenses récentes (pour le dashboard)
	 */
	async getRecentExpenses(limit = 10): Promise<Expense[]> {
		const response = await apiClient.get<{ success: true; data: Expense[] }>(`/expense/recent?limit=${limit}`);
		return response.data;
	},

	/**
	 * Crée une dépense manuelle
	 */
	async createExpense(expenseData: CreateExpenseData): Promise<Expense> {
		const response = await apiClient.post<ExpenseResponse>('/expense', expenseData);
		return response.data;
	},

	/**
	 * Crée une dépense depuis un produit (utilisé par l'inventaire)
	 * Cette méthode est appelée automatiquement lors de l'ajout de produits
	 */
	async createExpenseFromProduct(productData: {
		productName: string;
		amount: number;
		date: string;
		source?: string;
		category?: string;
	}): Promise<ProductWithBudgetImpactResponse['data']> {
		const response = await apiClient.post<ProductWithBudgetImpactResponse>('/expense/from-product', productData);
		return response.data;
	},

	/**
	 * Met à jour une dépense
	 */
	async updateExpense(expenseId: string, updateData: UpdateExpenseData): Promise<Expense> {
		const response = await apiClient.put<ExpenseResponse>(`/expense/${expenseId}`, updateData);
		return response.data;
	},

	/**
	 * Supprime une dépense
	 */
	async deleteExpense(expenseId: string): Promise<void> {
		await apiClient.delete(`/expense/${expenseId}`);
	},

	/**
	 * Calcule l'impact d'une dépense sur le budget
	 */
	async calculateExpenseImpact(amount: number, budgetId?: string): Promise<{
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
			}
		}>('/expense/calculate-impact', { amount, budgetId });
		return response.data;
	},

	/**
	 * Récupère les produits sans prix (pour affichage avec "-")
	 */
	async getExpensesWithoutAmount(budgetId?: string): Promise<Expense[]> {
		const url = budgetId 
			? `/expense/without-amount?budgetId=${budgetId}`
			: '/expense/without-amount';
		
		const response = await apiClient.get<{ success: true; data: Expense[] }>(url);
		return response.data;
	},

	// ===== MÉTHODES UTILITAIRES =====

	/**
	 * Marque une alerte comme lue
	 */
	async markAlertAsRead(alertId: string): Promise<void> {
		await apiClient.patch(`/budget/alerts/${alertId}/read`);
	},

	/**
	 * Récupère le budget d'un mois spécifique (format: "2024-12")
	 */
	async getBudgetByMonth(monthString: string): Promise<Budget | null> {
		try {
			const response = await apiClient.get<BudgetResponse>(`/budget/month/${monthString}`);
			return response.data;
		} catch (error) {
			// Si aucun budget trouvé pour ce mois, retourner null
			if ((error as { status?: number }).status === 404) {
				return null;
			}
			throw error;
		}
	},

	/**
	 * Récupère l'historique des budgets (pour la page budget)
	 */
	async getBudgetHistory(limit = 12): Promise<Budget[]> {
		const response = await apiClient.get<{ success: true; data: Budget[] }>(`/budget/history?limit=${limit}`);
		return response.data;
	},
};

// Export par défaut pour faciliter l'import
export default budgetService;