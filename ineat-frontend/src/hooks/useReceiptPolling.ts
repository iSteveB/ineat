import { useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { receiptService } from '@/services/receiptService';
import type {
	ReceiptStatusData,
	ReceiptStatus,
} from '@/services/receiptService';
import { useReceiptStore } from '@/stores/receiptStore';

// ===== TYPES =====

/**
 * Options de configuration du polling
 */
interface UseReceiptPollingOptions {
	/**
	 * ID du ticket à surveiller
	 */
	receiptId: string;

	/**
	 * Callback appelé quand le traitement est terminé avec succès
	 */
	onCompleted?: (data: ReceiptStatusData) => void;

	/**
	 * Callback appelé quand une erreur survient
	 */
	onError?: (error: string) => void;

	/**
	 * Callback appelé à chaque mise à jour du statut
	 */
	onStatusUpdate?: (data: ReceiptStatusData) => void;

	/**
	 * Intervalle de polling en millisecondes (défaut: 2000ms)
	 */
	pollingInterval?: number;

	/**
	 * Active ou désactive le polling
	 */
	enabled?: boolean;
}

/**
 * Résultat du hook
 */
interface UseReceiptPollingResult {
	/**
	 * Données du statut actuel
	 */
	status: ReceiptStatusData | undefined;

	/**
	 * Indique si une requête est en cours
	 */
	isLoading: boolean;

	/**
	 * Indique si le polling est actif
	 */
	isPolling: boolean;

	/**
	 * Erreur éventuelle
	 */
	error: Error | null;

	/**
	 * Force un refresh manuel du statut
	 */
	refetch: () => Promise<void>;

	/**
	 * Arrête le polling
	 */
	stopPolling: () => void;

	/**
	 * Reprend le polling
	 */
	startPolling: () => void;
}

// ===== CONSTANTES =====

/**
 * Intervalle de polling par défaut (2 secondes)
 */
const DEFAULT_POLLING_INTERVAL = 2000;

/**
 * Statuts considérés comme "terminaux" (arrêt du polling)
 */
const TERMINAL_STATUSES: ReadonlyArray<ReceiptStatus> = [
	'COMPLETED',
	'FAILED',
	'VALIDATED',
];

// ===== HOOK =====

/**
 * Hook personnalisé pour gérer le polling automatique du statut d'un ticket
 *
 * Fonctionnalités :
 * - Polling automatique avec intervalle configurable
 * - Arrêt automatique quand le statut est terminal
 * - Synchronisation avec le store Zustand
 * - Callbacks pour gérer les différents événements
 * - Gestion intelligente de la progression
 *
 * @example
 * ```tsx
 * const { status, isPolling } = useReceiptPolling({
 *   receiptId: 'receipt-123',
 *   onCompleted: (data) => navigate(`/receipts/${data.id}/results`),
 *   onError: (error) => toast.error(error),
 * });
 * ```
 */
export function useReceiptPolling({
	receiptId,
	onCompleted,
	onError,
	onStatusUpdate,
	pollingInterval = DEFAULT_POLLING_INTERVAL,
	enabled = true,
}: UseReceiptPollingOptions): UseReceiptPollingResult {
	// ===== STATE ET REFS =====

	// Références pour les callbacks (évite les re-renders)
	const onCompletedRef = useRef(onCompleted);
	const onErrorRef = useRef(onError);
	const onStatusUpdateRef = useRef(onStatusUpdate);

	// Store Zustand
	const updateActiveReceiptStatus = useReceiptStore(
		(state) => state.updateActiveReceiptStatus
	);
	const updateActiveReceiptProgress = useReceiptStore(
		(state) => state.updateActiveReceiptProgress
	);
	const setActiveReceiptError = useReceiptStore(
		(state) => state.setActiveReceiptError
	);

	// Référence pour suivre si le polling a déjà été arrêté
	const hasStoppedRef = useRef(false);

	// ===== MISE À JOUR DES REFS =====

	useEffect(() => {
		onCompletedRef.current = onCompleted;
		onErrorRef.current = onError;
		onStatusUpdateRef.current = onStatusUpdate;
	}, [onCompleted, onError, onStatusUpdate]);

	// ===== REQUÊTE AVEC TANSTACK QUERY =====

	const {
		data: statusResponse,
		error,
		isLoading,
		refetch,
		isFetching,
	} = useQuery({
		queryKey: ['receipt-status', receiptId],
		queryFn: async () => {
			const response = await receiptService.getReceiptStatus(receiptId);
			return response.data;
		},
		enabled: enabled && !hasStoppedRef.current,
		refetchInterval: (query) => {
			const data = query.state.data;

			// Arrêter le polling si le statut est terminal
			if (data && TERMINAL_STATUSES.includes(data.status)) {
				hasStoppedRef.current = true;
				return false;
			}

			// Continuer le polling avec l'intervalle configuré
			return pollingInterval;
		},
		refetchOnWindowFocus: false, // Évite les requêtes inutiles
		retry: 3, // Réessayer 3 fois en cas d'erreur
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
	});

	// ===== GESTION DES STATUTS =====

	/**
	 * Calcule la progression en fonction du statut
	 */
	const calculateProgress = useCallback(
		(status: ReceiptStatusData): number => {
			switch (status.status) {
				case 'PROCESSING':
					// Progression basée sur la validation des items
					if (status.totalItems > 0) {
						return Math.round(
							(status.validatedItems / status.totalItems) * 100
						);
					}
					// Progression par défaut si pas d'items
					return 30;

				case 'COMPLETED':
				case 'VALIDATED':
					return 100;

				case 'FAILED':
					return 0;

				default:
					return 0;
			}
		},
		[]
	);

	/**
	 * Met à jour le store avec les nouvelles données
	 */
	const updateStore = useCallback(
		(status: ReceiptStatusData) => {
			const progress = calculateProgress(status);

			// Mapper le statut backend vers le statut store
			let storeStatus: 'processing' | 'completed' | 'failed' =
				'processing';
			if (
				status.status === 'COMPLETED' ||
				status.status === 'VALIDATED'
			) {
				storeStatus = 'completed';
			} else if (status.status === 'FAILED') {
				storeStatus = 'failed';
			}

			// Mettre à jour le statut
			updateActiveReceiptStatus(storeStatus, progress);

			// Mettre à jour la progression avec le temps estimé
			if (status.status === 'PROCESSING') {
				updateActiveReceiptProgress(
					progress,
					status.estimatedTimeRemaining ?? undefined
				);
			}

			// Gérer les erreurs
			if (status.status === 'FAILED' && status.errorMessage) {
				setActiveReceiptError(status.errorMessage);
			}
		},
		[
			calculateProgress,
			updateActiveReceiptStatus,
			updateActiveReceiptProgress,
			setActiveReceiptError,
		]
	);

	// ===== EFFETS =====

	/**
	 * Gère les changements de statut
	 */
	useEffect(() => {
		if (!statusResponse) return;

		// Mettre à jour le store
		updateStore(statusResponse);

		// Appeler le callback de mise à jour
		onStatusUpdateRef.current?.(statusResponse);

		// Gérer les statuts terminaux
		if (
			statusResponse.status === 'COMPLETED' ||
			statusResponse.status === 'VALIDATED'
		) {
			onCompletedRef.current?.(statusResponse);
		} else if (statusResponse.status === 'FAILED') {
			const errorMessage =
				statusResponse.errorMessage ||
				'Erreur lors du traitement du ticket';
			onErrorRef.current?.(errorMessage);
		}
	}, [statusResponse, updateStore]);

	/**
	 * Gère les erreurs de requête
	 */
	useEffect(() => {
		if (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Erreur lors de la récupération du statut';

			setActiveReceiptError(errorMessage);
			onErrorRef.current?.(errorMessage);
		}
	}, [error, setActiveReceiptError]);

	// ===== ACTIONS =====

	/**
	 * Force un refresh manuel
	 */
	const forceRefetch = useCallback(async () => {
		await refetch();
	}, [refetch]);

	/**
	 * Arrête le polling
	 */
	const stopPolling = useCallback(() => {
		hasStoppedRef.current = true;
	}, []);

	/**
	 * Reprend le polling
	 */
	const startPolling = useCallback(() => {
		hasStoppedRef.current = false;
		refetch();
	}, [refetch]);

	// ===== RÉSULTAT =====

	return {
		status: statusResponse,
		isLoading,
		isPolling: isFetching && !hasStoppedRef.current,
		error: error as Error | null,
		refetch: forceRefetch,
		stopPolling,
		startPolling,
	};
}

// ===== UTILITAIRES =====

/**
 * Vérifie si un statut est terminal (le polling doit s'arrêter)
 */
export function isTerminalStatus(status: ReceiptStatus): boolean {
	return TERMINAL_STATUSES.includes(status);
}

/**
 * Calcule le temps restant formaté
 */
export function formatRemainingTime(
	seconds: number | null | undefined
): string {
	if (!seconds || seconds <= 0) return '';

	if (seconds < 60) {
		return `${Math.round(seconds)} seconde${seconds > 1 ? 's' : ''}`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.round(seconds % 60);

	if (remainingSeconds === 0) {
		return `${minutes} minute${minutes > 1 ? 's' : ''}`;
	}

	return `${minutes}min ${remainingSeconds}s`;
}

export type { UseReceiptPollingOptions, UseReceiptPollingResult };
