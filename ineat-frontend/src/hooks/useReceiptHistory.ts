import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { receiptService } from '@/services/receiptService';
import type {
	ReceiptHistory,
	ReceiptHistoryFilters,
	ReceiptStatusFilter,
	ReceiptSortOrder,
} from '@/services/receiptService';
import { useReceiptStore } from '@/stores/receiptStore';

// ===== TYPES =====

/**
 * Options de configuration du hook
 */
interface UseReceiptHistoryOptions {
	/**
	 * Active ou désactive la requête
	 */
	enabled?: boolean;

	/**
	 * Active le refresh automatique en arrière-plan
	 */
	refetchOnWindowFocus?: boolean;

	/**
	 * Intervalle de refresh automatique (en ms, false pour désactiver)
	 */
	refetchInterval?: number | false;
}

/**
 * Résultat du hook
 */
interface UseReceiptHistoryResult {
	/**
	 * Données de l'historique
	 */
	history: ReceiptHistory | undefined;

	/**
	 * Indique si les données sont en cours de chargement (première fois)
	 */
	isLoading: boolean;

	/**
	 * Indique si un refresh est en cours
	 */
	isFetching: boolean;

	/**
	 * Erreur éventuelle
	 */
	error: Error | null;

	/**
	 * Filtre actif
	 */
	filters: ReceiptHistoryFilters;

	/**
	 * Force un refresh manuel
	 */
	refetch: () => Promise<void>;

	/**
	 * Change la page
	 */
	setPage: (page: number) => void;

	/**
	 * Change le filtre de statut
	 */
	setStatus: (status: ReceiptStatusFilter) => void;

	/**
	 * Change l'ordre de tri
	 */
	setSortBy: (sortBy: ReceiptSortOrder) => void;

	/**
	 * Définit une plage de dates
	 */
	setDateRange: (dateFrom?: string, dateTo?: string) => void;

	/**
	 * Définit le nom du magasin
	 */
	setStoreName: (storeName?: string) => void;

	/**
	 * Définit la plage de montants
	 */
	setAmountRange: (minAmount?: number, maxAmount?: number) => void;

	/**
	 * Réinitialise tous les filtres
	 */
	resetFilters: () => void;

	/**
	 * Va à la page suivante
	 */
	nextPage: () => void;

	/**
	 * Va à la page précédente
	 */
	previousPage: () => void;

	/**
	 * Vérifie s'il y a une page suivante
	 */
	hasNextPage: boolean;

	/**
	 * Vérifie s'il y a une page précédente
	 */
	hasPreviousPage: boolean;
}

// ===== HOOK =====

/**
 * Hook personnalisé pour gérer l'historique des tickets
 * 
 * Fonctionnalités :
 * - Récupération de l'historique avec filtres et pagination
 * - Synchronisation avec le store Zustand
 * - Cache et invalidation intelligente avec TanStack Query
 * - Actions de pagination et filtrage
 * - Statistiques globales
 * 
 * @example
 * ```tsx
 * const { history, isLoading, setStatus, nextPage } = useReceiptHistory();
 * 
 * // Filtrer par statut
 * setStatus('COMPLETED');
 * 
 * // Aller à la page suivante
 * nextPage();
 * ```
 */
export function useReceiptHistory(
	options: UseReceiptHistoryOptions = {}
): UseReceiptHistoryResult {
	const {
		enabled = true,
		refetchOnWindowFocus = false,
		refetchInterval = false,
	} = options;

	// ===== STORE =====

	const storeFilters = useReceiptStore((state) => state.filters);
	const setStoreFilters = useReceiptStore((state) => state.setFilters);
	const setStorePage = useReceiptStore((state) => state.setPage);
	const setStoreStatus = useReceiptStore((state) => state.setStatus);
	const setStoreSortBy = useReceiptStore((state) => state.setSortBy);
	const setStoreDateRange = useReceiptStore((state) => state.setDateRange);
	const resetStoreFilters = useReceiptStore((state) => state.resetFilters);
	const setRefreshing = useReceiptStore((state) => state.setRefreshing);
	const updateLastRefreshTime = useReceiptStore(
		(state) => state.updateLastRefreshTime
	);

	// ===== REQUÊTE =====

	const {
		data: historyResponse,
		isLoading,
		isFetching,
		error,
		refetch: queryRefetch,
	} = useQuery({
		queryKey: ['receipt-history', storeFilters],
		queryFn: async () => {
			setRefreshing(true);
			try {
				const response = await receiptService.getReceiptHistory(storeFilters);
				updateLastRefreshTime();
				return response.data;
			} finally {
				setRefreshing(false);
			}
		},
		enabled,
		refetchOnWindowFocus,
		refetchInterval,
		staleTime: 30000, // 30 secondes
		gcTime: 5 * 60 * 1000, // 5 minutes (anciennement cacheTime)
	});

	// ===== ACTIONS DE FILTRAGE =====

	/**
	 * Change la page courante
	 */
	const setPage = useCallback(
		(page: number) => {
			if (page < 1) return;
			setStorePage(page);
		},
		[setStorePage]
	);

	/**
	 * Change le filtre de statut
	 */
	const setStatus = useCallback(
		(status: ReceiptStatusFilter) => {
			setStoreStatus(status);
		},
		[setStoreStatus]
	);

	/**
	 * Change l'ordre de tri
	 */
	const setSortBy = useCallback(
		(sortBy: ReceiptSortOrder) => {
			setStoreSortBy(sortBy);
		},
		[setStoreSortBy]
	);

	/**
	 * Définit une plage de dates
	 */
	const setDateRange = useCallback(
		(dateFrom?: string, dateTo?: string) => {
			setStoreDateRange(dateFrom, dateTo);
		},
		[setStoreDateRange]
	);

	/**
	 * Définit le nom du magasin
	 */
	const setStoreName = useCallback(
		(storeName?: string) => {
			setStoreFilters({ storeName });
		},
		[setStoreFilters]
	);

	/**
	 * Définit la plage de montants
	 */
	const setAmountRange = useCallback(
		(minAmount?: number, maxAmount?: number) => {
			setStoreFilters({ minAmount, maxAmount });
		},
		[setStoreFilters]
	);

	/**
	 * Réinitialise tous les filtres
	 */
	const resetFilters = useCallback(() => {
		resetStoreFilters();
	}, [resetStoreFilters]);

	// ===== ACTIONS DE PAGINATION =====

	/**
	 * Va à la page suivante
	 */
	const nextPage = useCallback(() => {
		if (historyResponse?.pagination.hasNextPage) {
			setPage(storeFilters.page + 1);
		}
	}, [historyResponse, storeFilters.page, setPage]);

	/**
	 * Va à la page précédente
	 */
	const previousPage = useCallback(() => {
		if (historyResponse?.pagination.hasPreviousPage) {
			setPage(storeFilters.page - 1);
		}
	}, [historyResponse, storeFilters.page, setPage]);

	/**
	 * Force un refresh manuel
	 */
	const refetch = useCallback(async () => {
		await queryRefetch();
	}, [queryRefetch]);

	// ===== RÉSULTAT =====

	return {
		history: historyResponse,
		isLoading,
		isFetching,
		error: error as Error | null,
		filters: storeFilters,
		refetch,
		setPage,
		setStatus,
		setSortBy,
		setDateRange,
		setStoreName,
		setAmountRange,
		resetFilters,
		nextPage,
		previousPage,
		hasNextPage: historyResponse?.pagination.hasNextPage ?? false,
		hasPreviousPage: historyResponse?.pagination.hasPreviousPage ?? false,
	};
}

// ===== UTILITAIRES =====

/**
 * Hook pour obtenir uniquement les statistiques sans les tickets
 */
export function useReceiptStats(options: UseReceiptHistoryOptions = {}) {
	const { history, isLoading, error } = useReceiptHistory(options);

	return {
		stats: history?.stats,
		isLoading,
		error,
	};
}

/**
 * Hook pour obtenir un ticket spécifique de l'historique par son ID
 */
export function useReceiptFromHistory(receiptId: string) {
	const { history } = useReceiptHistory();

	return {
		receipt: history?.receipts.find((r) => r.id === receiptId),
	};
}

/**
 * Formate les filtres pour l'affichage
 */
export function formatActiveFilters(filters: ReceiptHistoryFilters): string[] {
	const activeFilters: string[] = [];

	if (filters.status && filters.status !== 'ALL') {
		const statusLabels: Record<ReceiptStatusFilter, string> = {
			ALL: 'Tous',
			PROCESSING: 'En cours',
			COMPLETED: 'Terminés',
			FAILED: 'Échoués',
			VALIDATED: 'Validés',
		};
		activeFilters.push(`Statut: ${statusLabels[filters.status]}`);
	}

	if (filters.sortBy) {
		const sortLabels: Record<ReceiptSortOrder, string> = {
			NEWEST: 'Plus récents',
			OLDEST: 'Plus anciens',
			AMOUNT_HIGH: 'Montant décroissant',
			AMOUNT_LOW: 'Montant croissant',
		};
		activeFilters.push(`Tri: ${sortLabels[filters.sortBy]}`);
	}

	if (filters.dateFrom || filters.dateTo) {
		const from = filters.dateFrom
			? new Date(filters.dateFrom).toLocaleDateString('fr-FR')
			: '...';
		const to = filters.dateTo
			? new Date(filters.dateTo).toLocaleDateString('fr-FR')
			: '...';
		activeFilters.push(`Période: ${from} - ${to}`);
	}

	if (filters.storeName) {
		activeFilters.push(`Magasin: ${filters.storeName}`);
	}

	if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
		const min = filters.minAmount ? `${filters.minAmount}€` : '...';
		const max = filters.maxAmount ? `${filters.maxAmount}€` : '...';
		activeFilters.push(`Montant: ${min} - ${max}`);
	}

	return activeFilters;
}

/**
 * Vérifie si des filtres sont actifs (différents des valeurs par défaut)
 */
export function hasActiveFilters(filters: ReceiptHistoryFilters): boolean {
	return (
		(filters.status !== undefined && filters.status !== 'ALL') ||
		filters.dateFrom !== undefined ||
		filters.dateTo !== undefined ||
		filters.storeName !== undefined ||
		filters.minAmount !== undefined ||
		filters.maxAmount !== undefined
	);
}

export type { UseReceiptHistoryOptions, UseReceiptHistoryResult };