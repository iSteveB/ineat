/**
 * Hook pour poller le statut d'un ticket en temps réel
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { receiptService, ReceiptStatusData } from '@/services/receiptService';

interface UseReceiptPollingOptions {
	receiptId: string;
	onCompleted?: (data: ReceiptStatusData) => void;
	onError?: (error: Error) => void;
	pollingInterval?: number;
	enabled?: boolean;
}

/**
 * Hook pour récupérer le statut d'un ticket avec polling automatique
 *
 * @param options - Options du hook
 * @returns Query result avec le statut du ticket
 *
 * @example
 * ```tsx
 * const { status, isPolling, error } = useReceiptPolling({
 *   receiptId: 'abc-123',
 *   onCompleted: (status) => {
 *     if (status.status === 'COMPLETED') {
 *       navigate(`/receipt/${status.id}/results`);
 *     }
 *   },
 *   pollingInterval: 2000,
 * });
 * ```
 */
export function useReceiptPolling({
	receiptId,
	onCompleted,
	onError,
	pollingInterval = 2000,
	enabled = true,
}: UseReceiptPollingOptions) {
	// Query pour récupérer le statut
	const query = useQuery({
		queryKey: ['receipt-status', receiptId],

		// ✅ CORRECT : Fonction fléchée qui retourne une Promise
		queryFn: () => receiptService.getReceiptStatus(receiptId),

		// Options de polling
		enabled: enabled && !!receiptId,

		refetchInterval: (query) => {
			const data = query.state.data;

			// Si status = PROCESSING, continuer le polling
			if (data?.status === 'PROCESSING') {
				return pollingInterval;
			}

			// Si status = COMPLETED, FAILED, ou VALIDATED, arrêter le polling
			if (
				data?.status &&
				['COMPLETED', 'FAILED', 'VALIDATED'].includes(data.status)
			) {
				return false;
			}

			// Par défaut, continuer le polling
			return pollingInterval;
		},

		// Retry en cas d'erreur
		retry: (failureCount, error) => {
			// Ne pas retry si c'est une 404 (ticket non trouvé)
			if (
				error instanceof Error &&
				(error.message?.includes('404') ||
					error.message?.includes('non trouvé'))
			) {
				return false;
			}

			// Retry max 3 fois
			return failureCount < 3;
		},

		// Garder les données précédentes pendant le refetch
		placeholderData: (previousData) => previousData,

		// Refetch en arrière-plan
		refetchOnWindowFocus: false,
		refetchOnMount: true,
	});

	// ===== EFFETS =====

	/**
	 * Appeler onCompleted quand le traitement est terminé
	 */
	useEffect(() => {
		if (query.data) {
			const status = query.data.status;

			if (status === 'COMPLETED' || status === 'VALIDATED') {
				onCompleted?.(query.data);
			}
		}
	}, [query.data?.status, onCompleted, query.data]);

	/**
	 * Appeler onError en cas d'erreur
	 */
	useEffect(() => {
		if (query.error) {
			onError?.(query.error as Error);
		}
	}, [query.error, onError]);

	// ===== RETOUR =====

	return {
		status: query.data,
		isPolling: query.isFetching,
		isLoading: query.isLoading,
		error: query.error as Error | null,
		refetch: query.refetch,
	};
}

export type { UseReceiptPollingOptions };
