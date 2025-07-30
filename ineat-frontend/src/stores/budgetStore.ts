import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { budgetService } from '@/services/budgetService';
import {
	Budget,
	BudgetStats,
	BudgetAlert,
	Expense,
	UpdateBudgetData,
	getMonthString,
} from '@/schemas/budget';

interface BudgetState {
	currentBudget: Budget | null;
	budgetStats: BudgetStats | null;
	alerts: BudgetAlert[];
	isLoading: boolean;
	error: string | null;
	isFetching: boolean;
	lastFetchTime: number | null;
}

interface BudgetPageState {
	selectedBudget: Budget | null;
	expenses: Expense[];
	budgetHistory: Budget[];
	selectedMonth: string;
	isLoadingExpenses: boolean;
	isLoadingHistory: boolean;
	expensesError: string | null;
}

interface BudgetActions {
	fetchCurrentBudget: (force?: boolean) => Promise<void>;
	checkBudgetExists: () => Promise<boolean>;
	createMonthlyBudget: (amount: number) => Promise<Budget>;
	updateBudget: (budgetId: string, data: UpdateBudgetData) => Promise<Budget>;
	fetchBudgetByMonth: (month: string) => Promise<void>;
	fetchBudgetHistory: () => Promise<void>;
	setSelectedMonth: (month: string) => void;
	clearError: () => void;
	markAlertAsRead: (alertId: string) => Promise<void>;
	refreshBudgetData: () => Promise<void>;
	resetBudgetStore: () => void;
	updateBudgetStatsAfterExpense: () => Promise<void>;
}

export interface BudgetStore
	extends BudgetState,
		BudgetPageState,
		BudgetActions {}

const initialBudgetState: BudgetState = {
	currentBudget: null,
	budgetStats: null,
	alerts: [],
	isLoading: false,
	error: null,
	isFetching: false,
	lastFetchTime: null,
};

const initialBudgetPageState: BudgetPageState = {
	selectedBudget: null,
	expenses: [],
	budgetHistory: [],
	selectedMonth: getMonthString(),
	isLoadingExpenses: false,
	isLoadingHistory: false,
	expensesError: null,
};

export const useBudgetStore = create<BudgetStore>()(
	persist(
		(set, get) => ({
			...initialBudgetState,
			...initialBudgetPageState,

			fetchCurrentBudget: async (force = false) => {
				const state = get();

				if (state.isFetching && !force) {
					return;
				}

				if (
					!force &&
					state.lastFetchTime &&
					Date.now() - state.lastFetchTime < 5000
				) {
					return;
				}

				set({ isLoading: true, isFetching: true, error: null });

				try {
					const data = await budgetService.getCurrentBudget();

					set({
						currentBudget: data.budget || null,
						budgetStats: data.stats || null,
						alerts: data.alerts || [],
						expenses: data.expenses || [],
						isLoading: false,
						isFetching: false,
						lastFetchTime: Date.now(),
						error: null,
					});
				} catch {
					set({
						currentBudget: null,
						budgetStats: null,
						alerts: [],
						expenses: [],
						isLoading: false,
						isFetching: false,
						error: 'Impossible de récupérer le budget actuel',
						lastFetchTime: Date.now(),
					});
				}
			},

			/**
			 * Vérifie si l'utilisateur a un budget existant
			 */
			checkBudgetExists: async () => {
				try {
					const data = await budgetService.checkBudgetExists();

					if (data.exists && data.currentBudget) {
						set({ currentBudget: data.currentBudget });
					}

					return data.exists;
				} catch {
					return false;
				}
			},

			/**
			 * Crée un budget mensuel automatique
			 */
			createMonthlyBudget: async (amount: number) => {
				const state = get();

				if (state.isLoading) {
					throw new Error('Création de budget déjà en cours');
				}

				set({ isLoading: true, error: null });

				try {
					await budgetService.createMonthlyBudget(amount);
					await get().fetchCurrentBudget(true);

					const { currentBudget } = get();

					if (!currentBudget) {
						throw new Error('Budget créé mais non récupéré');
					}

					set({ isLoading: false });
					return currentBudget;
				} catch (error) {
					set({
						isLoading: false,
						error: 'Impossible de créer le budget',
					});
					throw error;
				}
			},

			/**
			 * Met à jour un budget existant
			 */
			updateBudget: async (budgetId: string, data: UpdateBudgetData) => {
				set({ isLoading: true, error: null });

				try {
					await budgetService.updateBudget(budgetId, data);
					await get().fetchCurrentBudget(true);

					const { currentBudget } = get();

					if (!currentBudget) {
						throw new Error('Budget mis à jour mais non récupéré');
					}

					set({ isLoading: false });
					return currentBudget;
				} catch (error) {
					set({
						isLoading: false,
						error: 'Impossible de mettre à jour le budget',
					});
					throw error;
				}
			},

			// ===== ACTIONS PAGE BUDGET =====

			/**
			 * Récupère un budget par mois spécifique
			 */
			fetchBudgetByMonth: async (month: string) => {
				set({ isLoading: true, error: null });

				try {
					const budget = await budgetService.getBudgetByMonth(month);

					set({
						selectedBudget: budget,
						selectedMonth: month,
						isLoading: false,
						expenses: [],
					});
				} catch {
					set({
						selectedBudget: null,
						expenses: [],
						isLoading: false,
						error: 'Impossible de récupérer le budget pour ce mois',
					});
				}
			},

			/**
			 * Récupère l'historique des budgets
			 */
			fetchBudgetHistory: async () => {
				set({ isLoadingHistory: true });

				try {
					const history = await budgetService.getBudgetHistory();
					set({ budgetHistory: history, isLoadingHistory: false });
				} catch {
					set({ budgetHistory: [], isLoadingHistory: false });
				}
			},

			setSelectedMonth: (month: string) => {
				set({ selectedMonth: month });
				get().fetchBudgetByMonth(month);
			},

			// ===== ACTIONS UTILITAIRES =====

			/**
			 * Efface les erreurs
			 */
			clearError: () => {
				set({ error: null, expensesError: null });
			},

			/**
			 * Marque une alerte comme lue
			 */
			markAlertAsRead: async (alertId: string) => {
				try {
					await budgetService.markAlertAsRead(alertId);
					set((state) => ({
						alerts: state.alerts.map((alert) =>
							alert.id === alertId
								? { ...alert, isRead: true }
								: alert
						),
					}));
				} catch {
					// Silently fail
				}
			},

			/**
			 * Rafraîchit toutes les données budget
			 */
			refreshBudgetData: async () => {
				await Promise.all([
					get().fetchCurrentBudget(true),
					get().fetchBudgetHistory(),
				]);
			},

			resetBudgetStore: () => {
				set({
					...initialBudgetState,
					...initialBudgetPageState,
					selectedMonth: getMonthString(),
				});
			},

			/**
			 * Met à jour les statistiques du budget après ajout de produit
			 */
			updateBudgetStatsAfterExpense: async () => {
				const { currentBudget } = get();
				if (currentBudget) {
					try {
						const stats = await budgetService.getBudgetStats(
							currentBudget.id
						);
						const alerts = await budgetService.getBudgetAlerts(
							currentBudget.id
						);

						set({
							budgetStats: stats,
							alerts,
							lastFetchTime: Date.now(),
						});
					} catch {
						// Silently fail
					}
				}
			},
		}),
		{
			name: 'ineat-budget-store',
			storage: createJSONStorage(() => localStorage),
			// Persister seulement certaines données (pas les états de loading ni les erreurs)
			partialize: (state) => ({
				currentBudget: state.currentBudget,
				selectedMonth: state.selectedMonth,
				budgetHistory: state.budgetHistory,
				lastFetchTime: state.lastFetchTime,
			}),
		}
	)
);

// ===== SÉLECTEURS =====

/**
 * Sélecteur pour vérifier si l'utilisateur a un budget
 */
export const useHasBudget = () => {
	return useBudgetStore((state) => !!state.currentBudget);
};

/**
 * Sélecteur pour les alertes non lues
 */
export const useUnreadAlerts = () => {
	return useBudgetStore((state) =>
		state.alerts.filter((alert) => !alert.isRead)
	);
};

/**
 * Sélecteur pour le statut de risque du budget
 */
export const useBudgetRiskLevel = () => {
	return useBudgetStore((state) => state.budgetStats?.riskLevel || 'LOW');
};

/**
 * Sélecteur pour vérifier si le budget est proche du dépassement
 */
export const useIsNearBudgetLimit = () => {
	return useBudgetStore((state) => state.budgetStats?.isNearBudget || false);
};

/**
 * Sélecteur pour le pourcentage d'utilisation du budget
 */
export const useBudgetUsagePercentage = () => {
	return useBudgetStore((state) => state.budgetStats?.percentageUsed || 0);
};

export default useBudgetStore;
