import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
	ReceiptStatusFilter,
	ReceiptSortOrder,
	ReceiptHistoryFilters,
} from '@/services/receiptService';

// ===== TYPES =====

/**
 * État d'un ticket en cours de traitement
 */
interface ActiveReceiptState {
	receiptId: string;
	status: 'uploading' | 'processing' | 'completed' | 'failed';
	progress: number; // 0-100
	estimatedTimeRemaining?: number;
	errorMessage?: string;
}

/**
 * Filtres actifs pour l'historique
 */
interface ActiveFilters extends ReceiptHistoryFilters {
	page: number;
	limit: number;
	status: ReceiptStatusFilter;
	sortBy: ReceiptSortOrder;
}

/**
 * État du store de tickets
 */
interface ReceiptStoreState {
	// Ticket actif (en cours de traitement)
	activeReceipt: ActiveReceiptState | null;

	// Filtres de l'historique
	filters: ActiveFilters;

	// État de synchronisation
	isRefreshing: boolean;
	lastRefreshTime: Date | null;

	// Actions pour le ticket actif
	setActiveReceipt: (receipt: ActiveReceiptState | null) => void;
	updateActiveReceiptStatus: (
		status: ActiveReceiptState['status'],
		progress?: number
	) => void;
	updateActiveReceiptProgress: (progress: number, estimatedTime?: number) => void;
	setActiveReceiptError: (error: string) => void;
	clearActiveReceipt: () => void;

	// Actions pour les filtres
	setFilters: (filters: Partial<ActiveFilters>) => void;
	resetFilters: () => void;
	setPage: (page: number) => void;
	setStatus: (status: ReceiptStatusFilter) => void;
	setSortBy: (sortBy: ReceiptSortOrder) => void;
	setDateRange: (dateFrom?: string, dateTo?: string) => void;

	// Actions de synchronisation
	setRefreshing: (isRefreshing: boolean) => void;
	updateLastRefreshTime: () => void;

	// Reset global
	reset: () => void;
}

// ===== ÉTAT INITIAL =====

const initialFilters: ActiveFilters = {
	page: 1,
	limit: 20,
	status: 'ALL',
	sortBy: 'NEWEST',
};

const initialState = {
	activeReceipt: null,
	filters: initialFilters,
	isRefreshing: false,
	lastRefreshTime: null,
};

// ===== STORE =====

/**
 * Store Zustand pour la gestion des tickets de caisse
 * 
 * Fonctionnalités :
 * - Gestion du ticket actif en cours de traitement
 * - Filtres et pagination pour l'historique
 * - État de synchronisation et refresh
 * - Persistance des filtres dans le localStorage
 */
export const useReceiptStore = create<ReceiptStoreState>()(
	devtools(
		persist(
			(set) => ({
				...initialState,

				// ===== ACTIONS TICKET ACTIF =====

				/**
				 * Définit le ticket actif en cours de traitement
				 */
				setActiveReceipt: (receipt) => {
					set({ activeReceipt: receipt }, false, 'setActiveReceipt');
				},

				/**
				 * Met à jour le statut du ticket actif
				 */
				updateActiveReceiptStatus: (status, progress) => {
					set(
						(state) => {
							if (!state.activeReceipt) return state;

							return {
								activeReceipt: {
									...state.activeReceipt,
									status,
									progress: progress ?? state.activeReceipt.progress,
								},
							};
						},
						false,
						'updateActiveReceiptStatus'
					);
				},

				/**
				 * Met à jour la progression du ticket actif
				 */
				updateActiveReceiptProgress: (progress, estimatedTime) => {
					set(
						(state) => {
							if (!state.activeReceipt) return state;

							return {
								activeReceipt: {
									...state.activeReceipt,
									progress,
									estimatedTimeRemaining: estimatedTime,
								},
							};
						},
						false,
						'updateActiveReceiptProgress'
					);
				},

				/**
				 * Définit une erreur pour le ticket actif
				 */
				setActiveReceiptError: (error) => {
					set(
						(state) => {
							if (!state.activeReceipt) return state;

							return {
								activeReceipt: {
									...state.activeReceipt,
									status: 'failed',
									errorMessage: error,
								},
							};
						},
						false,
						'setActiveReceiptError'
					);
				},

				/**
				 * Efface le ticket actif
				 */
				clearActiveReceipt: () => {
					set({ activeReceipt: null }, false, 'clearActiveReceipt');
				},

				// ===== ACTIONS FILTRES =====

				/**
				 * Met à jour les filtres (merge partiel)
				 */
				setFilters: (newFilters) => {
					set(
						(state) => ({
							filters: {
								...state.filters,
								...newFilters,
							},
						}),
						false,
						'setFilters'
					);
				},

				/**
				 * Réinitialise les filtres aux valeurs par défaut
				 */
				resetFilters: () => {
					set(
						{ filters: initialFilters },
						false,
						'resetFilters'
					);
				},

				/**
				 * Change la page courante
				 */
				setPage: (page) => {
					set(
						(state) => ({
							filters: {
								...state.filters,
								page,
							},
						}),
						false,
						'setPage'
					);
				},

				/**
				 * Change le filtre de statut
				 */
				setStatus: (status) => {
					set(
						(state) => ({
							filters: {
								...state.filters,
								status,
								page: 1, // Reset à la page 1 quand on change le filtre
							},
						}),
						false,
						'setStatus'
					);
				},

				/**
				 * Change l'ordre de tri
				 */
				setSortBy: (sortBy) => {
					set(
						(state) => ({
							filters: {
								...state.filters,
								sortBy,
								page: 1, // Reset à la page 1 quand on change le tri
							},
						}),
						false,
						'setSortBy'
					);
				},

				/**
				 * Définit une plage de dates pour le filtre
				 */
				setDateRange: (dateFrom, dateTo) => {
					set(
						(state) => ({
							filters: {
								...state.filters,
								dateFrom,
								dateTo,
								page: 1, // Reset à la page 1 quand on change les dates
							},
						}),
						false,
						'setDateRange'
					);
				},

				// ===== ACTIONS SYNCHRONISATION =====

				/**
				 * Définit l'état de refresh
				 */
				setRefreshing: (isRefreshing) => {
					set({ isRefreshing }, false, 'setRefreshing');
				},

				/**
				 * Met à jour le timestamp du dernier refresh
				 */
				updateLastRefreshTime: () => {
					set(
						{ lastRefreshTime: new Date() },
						false,
						'updateLastRefreshTime'
					);
				},

				// ===== RESET GLOBAL =====

				/**
				 * Réinitialise tout le store
				 */
				reset: () => {
					set(initialState, false, 'reset');
				},
			}),
			{
				name: 'receipt-storage',
				// On persiste uniquement les filtres, pas le ticket actif
				partialize: (state) => ({
					filters: state.filters,
				}),
			}
		),
		{
			name: 'ReceiptStore',
			enabled: import.meta.env.DEV, // DevTools uniquement en développement
		}
	)
);

// ===== SÉLECTEURS =====

/**
 * Sélecteurs optimisés pour éviter les re-renders inutiles
 */
export const receiptSelectors = {
	/**
	 * Sélectionne le ticket actif
	 */
	activeReceipt: (state: ReceiptStoreState) => state.activeReceipt,

	/**
	 * Sélectionne les filtres actifs
	 */
	filters: (state: ReceiptStoreState) => state.filters,

	/**
	 * Vérifie si un refresh est en cours
	 */
	isRefreshing: (state: ReceiptStoreState) => state.isRefreshing,

	/**
	 * Vérifie si un ticket est en cours de traitement
	 */
	hasActiveReceipt: (state: ReceiptStoreState) => state.activeReceipt !== null,

	/**
	 * Vérifie si le ticket actif est en erreur
	 */
	hasActiveReceiptError: (state: ReceiptStoreState) =>
		state.activeReceipt?.status === 'failed',

	/**
	 * Récupère le progrès du ticket actif (0-100)
	 */
	activeReceiptProgress: (state: ReceiptStoreState) =>
		state.activeReceipt?.progress ?? 0,
};

// Export du type pour utilisation externe
export type { ReceiptStoreState, ActiveReceiptState, ActiveFilters };