import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { inventoryApi, handleInventoryError } from '@/services/inventoryService';
import {
	AddManualProductInput,
	ProductCreatedResponse,
	InventoryItem,
	InventoryFilters,
} from '@/schemas/inventorySchema';

// Type pour les données de mise à jour d'un item d'inventaire
type UpdateInventoryItemData = {
	quantity?: number;
	expiryDate?: string;
	storageLocation?: string;
	notes?: string;
	purchasePrice?: number;
};

// Type pour les paramètres de la mutation updateInventoryItem
type UpdateInventoryItemParams = {
	inventoryItemId: string;
	updateData: UpdateInventoryItemData;
};

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
};

/**
 * Hook pour récupérer l'inventaire de l'utilisateur
 * @param filters Filtres optionnels
 * @param options Options TanStack Query
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
		queryFn: () => inventoryApi.getUserInventory(filters),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes (anciennement cacheTime)
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
		queryFn: () => inventoryApi.getInventoryStats(),
		staleTime: 1000 * 60 * 10, // 10 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
		meta: {
			errorMessage: 'Impossible de charger les statistiques',
		},
	});
}

/**
 * Hook pour rechercher des produits (autocomplete)
 * @param query Terme de recherche
 * @param options Options de la requête
 */
export function useProductSearch(
	query: string,
	options?: {
		enabled?: boolean;
		minQueryLength?: number;
	}
) {
	const minLength = options?.minQueryLength ?? 2;

	return useQuery({
		queryKey: inventoryKeys.searchQuery(query),
		queryFn: () => inventoryApi.searchProducts(query),
		enabled: (options?.enabled ?? true) && query.length >= minLength,
		staleTime: 1000 * 60 * 15, // 15 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
		meta: {
			errorMessage: 'Erreur lors de la recherche',
		},
	});
}

/**
 * Hook pour ajouter un produit manuellement
 */
export function useAddManualProduct() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (productData: AddManualProductInput) =>
			inventoryApi.addManualProduct(productData),

		onSuccess: (data: ProductCreatedResponse) => {
			// Invalider et refetch l'inventaire pour afficher le nouveau produit
			queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
			queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() });

			// Optionnel : ajouter optimistiquement le produit au cache
			// queryClient.setQueryData(inventoryKeys.list(), (oldData: InventoryItem[] | undefined) => {
			//   if (!oldData) return oldData;
			//   return [transformToInventoryItem(data), ...oldData];
			// });

			toast.success('Produit ajouté avec succès à votre inventaire !', {
				description: `${data.name} (${
					data.quantity
				} ${data.unitType.toLowerCase()})`,
			});
		},

		onError: (error: unknown) => {
			const inventoryError = handleInventoryError(error);

			toast.error("Erreur lors de l'ajout du produit", {
				description: inventoryError.message,
			});

			console.error('Erreur mutation addManualProduct:', inventoryError);
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

	return useMutation<InventoryItem, unknown, UpdateInventoryItemParams>({
		mutationFn: async ({
			inventoryItemId,
			updateData,
		}: UpdateInventoryItemParams): Promise<InventoryItem> => {
			const response = await inventoryApi.updateInventoryItem(inventoryItemId, updateData);
			
			// Normaliser la réponse pour s'assurer que tous les champs requis sont présents
			return {
				...response,
				createdAt: response.createdAt || new Date().toISOString(),
				updatedAt: response.updatedAt || new Date().toISOString(),
				product: {
					...response.product,
					category: {
						...response.product.category,
						icon: response.product.category.icon || undefined,
					},
				},
			};
		},

		onSuccess: (updatedItem: InventoryItem, variables) => {
			// Mettre à jour le cache optimistiquement
			queryClient.setQueryData(
				inventoryKeys.detail(variables.inventoryItemId),
				updatedItem
			);

			// Invalider les listes pour refléter les changements
			queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
			queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() });

			toast.success('Produit mis à jour avec succès');
		},

		onError: (error: unknown) => {
			const inventoryError = handleInventoryError(error);

			toast.error('Erreur lors de la mise à jour', {
				description: inventoryError.message,
			});
		},
	});
}

/**
 * Hook pour supprimer un élément d'inventaire
 */
export function useRemoveInventoryItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (inventoryItemId: string) =>
			inventoryApi.removeInventoryItem(inventoryItemId),

		onSuccess: (_, inventoryItemId) => {
			// Supprimer l'élément du cache optimistiquement
			queryClient.removeQueries({
				queryKey: inventoryKeys.detail(inventoryItemId),
			});

			// Mettre à jour les listes
			queryClient.setQueriesData(
				{ queryKey: inventoryKeys.lists() },
				(oldData: InventoryItem[] | undefined) => {
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

		onError: (error: unknown) => {
			const inventoryError = handleInventoryError(error);

			toast.error('Erreur lors de la suppression', {
				description: inventoryError.message,
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
			queryFn: () => inventoryApi.getUserInventory(filters),
			staleTime: 1000 * 60 * 5,
		});
	};

	const prefetchStats = () => {
		queryClient.prefetchQuery({
			queryKey: inventoryKeys.stats(),
			queryFn: () => inventoryApi.getInventoryStats(),
			staleTime: 1000 * 60 * 10,
		});
	};

	return {
		prefetchInventory,
		prefetchStats,
	};
}

/**
 * Utilitaire pour transformer une ProductCreatedResponse en InventoryItem
 * (si nécessaire pour la mise en cache optimiste)
 */
export function transformToInventoryItem(
	response: ProductCreatedResponse
): Partial<InventoryItem> {
	return {
		id: response.id,
		quantity: response.quantity,
		expiryDate: response.expiryDate,
		purchaseDate: response.purchaseDate,
		purchasePrice: response.purchasePrice,
		storageLocation: response.storageLocation,
		notes: response.notes,
		createdAt: response.createdAt,
		updatedAt: response.updatedAt,
		// Les données du produit devraient être récupérées via une nouvelle requête
		// ou transformées si on a suffisamment d'informations
	};
}