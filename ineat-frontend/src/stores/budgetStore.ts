import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { budgetService } from '@/services/budgetService';
import {
	BudgetStore,
	UpdateBudgetData,
	getMonthString,
} from '@/schemas/budget';

// ===== ÉTAT INITIAL =====

const initialBudgetState = {
	currentBudget: null,
	budgetStats: null,
	alerts: [],
	isLoading: false,
	error: null,
};

const initialBudgetPageState = {
	selectedBudget: null,
	expenses: [],
	budgetHistory: [],
	selectedMonth: getMonthString(), // Mois courant par défaut
	isLoadingExpenses: false,
	isLoadingHistory: false,
	expensesError: null,
};

// ===== STORE ZUSTAND =====

export const useBudgetStore = create<BudgetStore>()(
	persist(
		(set, get) => ({
			// ===== ÉTAT =====
			...initialBudgetState,
			...initialBudgetPageState,

			// ===== ACTIONS BUDGET =====

			/**
			 * Récupère le budget du mois courant avec stats et alertes
			 */
			fetchCurrentBudget: async () => {
				set({ isLoading: true, error: null });

				try {
					const data = await budgetService.getCurrentBudget();

					set({
						currentBudget: data.budget,
						budgetStats: data.stats,
						alerts: data.alerts,
						isLoading: false,
					});
				} catch (error) {
					console.error(
						'Erreur lors de la récupération du budget actuel:',
						error
					);
					set({
						currentBudget: null,
						budgetStats: null,
						alerts: [],
						isLoading: false,
						error: 'Impossible de récupérer le budget actuel',
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
				} catch (error) {
					console.error(
						'Erreur lors de la vérification du budget:',
						error
					);
					return false;
				}
			},

			/**
			 * Crée un budget mensuel automatique
			 */
			createMonthlyBudget: async (amount: number) => {
				set({ isLoading: true, error: null });

				try {
					const newBudget = await budgetService.createMonthlyBudget(
						amount
					);

					set({
						currentBudget: newBudget,
						isLoading: false,
					});

					// Rafraîchir les stats après création
					await get().fetchCurrentBudget();

					return newBudget;
				} catch (error) {
					console.error(
						'Erreur lors de la création du budget:',
						error
					);
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
					const updatedBudget = await budgetService.updateBudget(
						budgetId,
						data
					);

					set((state) => ({
						currentBudget:
							state.currentBudget?.id === budgetId
								? updatedBudget
								: state.currentBudget,
						selectedBudget:
							state.selectedBudget?.id === budgetId
								? updatedBudget
								: state.selectedBudget,
						isLoading: false,
					}));

					// Rafraîchir les stats si c'est le budget courant
					if (get().currentBudget?.id === budgetId) {
						await get().fetchCurrentBudget();
					}

					return updatedBudget;
				} catch (error) {
					console.error(
						'Erreur lors de la mise à jour du budget:',
						error
					);
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
					});

					// Récupérer les dépenses si un budget existe
					if (budget) {
						await get().fetchExpensesByBudget(budget.id);
					} else {
						set({ expenses: [] });
					}
				} catch (error) {
					console.error(
						'Erreur lors de la récupération du budget par mois:',
						error
					);
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

					set({
						budgetHistory: history,
						isLoadingHistory: false,
					});
				} catch (error) {
					console.error(
						"Erreur lors de la récupération de l'historique:",
						error
					);
					set({
						budgetHistory: [],
						isLoadingHistory: false,
					});
				}
			},

			/**
			 * Récupère les dépenses d'un budget spécifique
			 */
			fetchExpensesByBudget: async (budgetId: string) => {
				set({ isLoadingExpenses: true, expensesError: null });

				try {
					const data = await budgetService.getExpensesByBudget(
						budgetId
					);

					set({
						expenses: data.items,
						isLoadingExpenses: false,
					});
				} catch (error) {
					console.error(
						'Erreur lors de la récupération des dépenses:',
						error
					);
					set({
						expenses: [],
						isLoadingExpenses: false,
						expensesError: 'Impossible de récupérer les dépenses',
					});
				}
			},

			/**
			 * Change le mois sélectionné et récupère le budget correspondant
			 */
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
				} catch (error) {
					console.error(
						"Erreur lors du marquage de l'alerte:",
						error
					);
				}
			},

			/**
			 * Rafraîchit toutes les données budget
			 */
			refreshBudgetData: async () => {
				await Promise.all([
					get().fetchCurrentBudget(),
					get().fetchBudgetHistory(),
				]);

				// Rafraîchir les dépenses si un budget est sélectionné
				const { selectedBudget } = get();
				if (selectedBudget) {
					await get().fetchExpensesByBudget(selectedBudget.id);
				}
			},

			/**
			 * Réinitialise l'état du store
			 */
			resetBudgetStore: () => {
				set({
					...initialBudgetState,
					...initialBudgetPageState,
					selectedMonth: getMonthString(), // Garder le mois courant
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
						});
					} catch (error) {
						console.error(
							'Erreur lors de la mise à jour des stats:',
							error
						);
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
			}),
		}
	)
);

// ===== SÉLECTEURS UTILES =====

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

// Export par défaut
export default useBudgetStore;
