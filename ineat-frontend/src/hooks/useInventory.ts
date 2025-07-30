import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	inventoryService,
	UpdateInventoryItemInput,
	InventoryItemResponse,
	ProductAddedWithBudgetResult, // Import du bon type
} from '@/services/inventoryService';
import { AddInventoryItemData, InventoryFilters } from '@/schemas';

// Type pour les paramètres de la mutation updateInventoryItem
interface UpdateInventoryItemParams {
	inventoryItemId: string;
	updateData: UpdateInventoryItemInput;
}

// Clés de cache pour les requêtes
export const inventoryKeys = {
	all: ['inventory'] as const,
	lists: () => [...inventoryKeys.all, 'list'] as const,
	list: (filters?: InventoryFilters) =>
		[...inventoryKeys.lists(), filters] as const,
	details: () => [...inventoryKeys.all, 'detail'] as const,
	detail: (id: string) => [...inventoryKeys.details(), id] as const,
	stats: () => [...inventoryKeys.all, 'stats'] as const,
	search: () => [...inventoryKeys.all, 'search'] as const,
	searchQuery: (query: string) => [...inventoryKeys.search(), query] as const,
} as const;

/**
 * Hook pour récupérer l'inventaire de l'utilisateur
 */
export function useInventory(
	filters?: InventoryFilters,
	options?: {
		enabled?: boolean;
		refetchOnWindowFocus?: boolean;
	}
) {
	return useQuery({
		queryKey: inventoryKeys.list(filters),
		queryFn: () => inventoryService.getInventory(filters),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
		enabled: options?.enabled ?? true,
		meta: {
			errorMessage: 'Impossible de charger votre inventaire',
		},
	});
}

/**
 * Hook pour récupérer les statistiques de l'inventaire
 */
export function useInventoryStats() {
	return useQuery({
		queryKey: inventoryKeys.stats(),
		queryFn: () => inventoryService.getInventoryStats(),
		staleTime: 1000 * 60 * 10, // 10 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
		meta: {
			errorMessage: 'Impossible de charger les statistiques',
		},
	});
}

/**
 * Hook pour ajouter un produit manuellement
 * CORRECTION: Types alignés avec ProductAddedWithBudgetResult
 */
export function useAddManualProduct() {
	const queryClient = useQueryClient();

	return useMutation<
		ProductAddedWithBudgetResult, // Type de retour correct
		Error, // Type d'erreur
		AddInventoryItemData // Type des variables
	>({
		mutationFn: (productData: AddInventoryItemData) =>
			inventoryService.addManualProduct(productData),

		onSuccess: (data: ProductAddedWithBudgetResult) => {
			// Invalider et refetch l'inventaire pour afficher le nouveau produit
			queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
			queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() });

			// Gestion des toasts selon le type de réponse budgétaire
			switch (data.type) {
				case 'success':
					toast.success(data.message, {
						description: `${data.productName} ajouté à l'inventaire`,
					});
					break;
				case 'info':
					toast.info(data.message, {
						description: `${data.productName}`,
					});
					break;
				case 'warning':
					toast.warning(data.message, {
						description: `${data.productName}`,
					});
					break;
			}

			// Si le budget doit être rafraîchi
			if (data.shouldRefreshBudget) {
				queryClient.invalidateQueries({ queryKey: ['budget'] });
			}
		},

		onError: (error: Error) => {
			const errorMessage =
				error.message || "Erreur lors de l'ajout du produit";

			toast.error("Erreur lors de l'ajout du produit", {
				description: errorMessage,
			});

			console.error('Erreur mutation addManualProduct:', error);
		},

		meta: {
			loadingMessage: 'Ajout du produit en cours...',
		},
	});
}

/**
 * Hook pour mettre à jour un élément d'inventaire
 */
export function useUpdateInventoryItem() {
	const queryClient = useQueryClient();

	return useMutation<InventoryItemResponse, Error, UpdateInventoryItemParams>(
		{
			mutationFn: async ({
				inventoryItemId,
				updateData,
			}: UpdateInventoryItemParams): Promise<InventoryItemResponse> => {
				return await inventoryService.updateInventoryItem(
					inventoryItemId,
					updateData
				);
			},

			onSuccess: (updatedItem: InventoryItemResponse, variables) => {
				// Mettre à jour le cache optimistiquement
				queryClient.setQueryData(
					inventoryKeys.detail(variables.inventoryItemId),
					updatedItem
				);

				// Invalider les listes pour refléter les changements
				queryClient.invalidateQueries({
					queryKey: inventoryKeys.lists(),
				});
				queryClient.invalidateQueries({
					queryKey: inventoryKeys.stats(),
				});

				toast.success('Produit mis à jour avec succès');
			},

			onError: (error: Error) => {
				const errorMessage =
					error.message || 'Erreur lors de la mise à jour';

				toast.error('Erreur lors de la mise à jour', {
					description: errorMessage,
				});
			},
		}
	);
}

/**
 * Hook pour supprimer un élément d'inventaire
 */
export function useRemoveInventoryItem() {
	const queryClient = useQueryClient();

	return useMutation<
		void, // Le service de suppression ne retourne rien
		Error,
		string // ID de l'item à supprimer
	>({
		mutationFn: (inventoryItemId: string) =>
			inventoryService.removeInventoryItem(inventoryItemId),

		onSuccess: (_, inventoryItemId) => {
			// Supprimer l'élément du cache optimistiquement
			queryClient.removeQueries({
				queryKey: inventoryKeys.detail(inventoryItemId),
			});

			// Mettre à jour les listes
			queryClient.setQueriesData<InventoryItemResponse[]>(
				{ queryKey: inventoryKeys.lists() },
				(oldData) => {
					if (!oldData) return oldData;
					return oldData.filter(
						(item) => item.id !== inventoryItemId
					);
				}
			);

			// Invalider les stats
			queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() });

			toast.success('Produit supprimé de votre inventaire');
		},

		onError: (error: Error) => {
			const errorMessage =
				error.message || 'Erreur lors de la suppression';

			toast.error('Erreur lors de la suppression', {
				description: errorMessage,
			});
		},
	});
}

/**
 * Hook personnalisé pour gérer l'état de chargement global des mutations d'inventaire
 */
export function useInventoryMutationsStatus() {
	const queryClient = useQueryClient();

	// Récupérer l'état de toutes les mutations en cours
	const mutationCache = queryClient.getMutationCache();
	const mutations = mutationCache.getAll();

	const inventoryMutations = mutations.filter((mutation) =>
		mutation.options.mutationKey?.some(
			(key) => typeof key === 'string' && key.includes('inventory')
		)
	);

	const isAnyLoading = inventoryMutations.some(
		(mutation) => mutation.state.status === 'pending'
	);

	return {
		isLoading: isAnyLoading,
		activeMutationsCount: inventoryMutations.length,
	};
}

/**
 * Hook pour prefetch les données d'inventaire
 * Utile pour optimiser le chargement des pages
 */
export function usePrefetchInventory() {
	const queryClient = useQueryClient();

	const prefetchInventory = (filters?: InventoryFilters) => {
		queryClient.prefetchQuery({
			queryKey: inventoryKeys.list(filters),
			queryFn: () => inventoryService.getInventory(filters),
			staleTime: 1000 * 60 * 5,
		});
	};

	const prefetchStats = () => {
		queryClient.prefetchQuery({
			queryKey: inventoryKeys.stats(),
			queryFn: () => inventoryService.getInventoryStats(),
			staleTime: 1000 * 60 * 10,
		});
	};

	return {
		prefetchInventory,
		prefetchStats,
	};
}
