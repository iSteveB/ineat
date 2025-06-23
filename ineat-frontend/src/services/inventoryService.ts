import { apiClient } from '@/lib/api-client';
import {
	AddManualProductInput,
	Category,
	InventoryFilters,
	UnitType,
} from '@/schemas/productSchema';

// Types pour les réponses de l'API d'inventaire
export interface InventoryItemResponse {
	id: string;
	quantity: number;
	expiryDate: string | null;
	purchaseDate: string;
	purchasePrice: number | null;
	storageLocation: string | null;
	notes: string | null;
	createdAt: string; // Date d'ajout à l'inventaire
	updatedAt: string; // Date de dernière modification
	product: {
		id: string;
		name: string;
		brand: string | null;
		nutriscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
		ecoScore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
		novaScore: 'A' | 'B' | 'C' | 'D' | null;
		unitType: 'KG' | 'G' | 'L' | 'ML' | 'UNIT';
		imageUrl: string | null;
		nutrients: {
			carbohydrates?: number;
			proteins?: number;
			fats?: number;
			salt?: number;
			calories?: number;
			[key: string]: number | undefined;
		} | null;
		category: {
			id: string;
			name: string;
			slug: string;
		};
	};
}

export interface ProductCreatedResponse {
	id: string;
	name: string;
	brand: string | null;
	category: string;
	quantity: number;
	unitType: 'KG' | 'G' | 'L' | 'ML' | 'UNIT';
	purchaseDate: string;
	expiryDate: string | null;
	purchasePrice: number | null;
	storageLocation: string | null;
	notes: string | null;
	nutriscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
	ecoscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
	createdAt: string;
	updatedAt: string;
}

export interface InventoryStatsResponse {
	totalItems: number;
	totalValue: number;
	expiringInWeek: number;
	categoriesBreakdown: Array<{
		categoryName: string;
		count: number;
		percentage: number;
	}>;
	storageBreakdown: Record<string, number>;
}

export interface UpdateInventoryItemInput {
	quantity?: number;
	expiryDate?: string | null;
	storageLocation?: string | null;
	notes?: string | null;
	purchasePrice?: number | null;
}

// Types pour la recherche de produits
export interface ProductSearchResult {
	id: string;
	name: string;
	brand: string | null;
	nutriscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
	ecoScore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
	imageUrl: string | null;
	unitType: UnitType;
	barcode?: string | null;
	category: {
		id: string;
		name: string;
		slug: string;
		icon: string | null;
	};
	relevanceScore?: number;
}

export interface QuickAddFormData {
	productId: string;
	quantity: number;
	expiryDate?: string;
	purchaseDate: string;
	purchasePrice?: number;
	storageLocation?: string;
	notes?: string;
}

/**
 * Service pour gérer les opérations d'inventaire
 */
export const inventoryService = {
	/**
	 * Récupère l'inventaire complet de l'utilisateur avec filtres optionnels
	 */
	async getInventory(
		filters?: InventoryFilters
	): Promise<InventoryItemResponse[]> {
		const searchParams = new URLSearchParams();

		if (filters?.category) {
			searchParams.append('category', filters.category);
		}

		if (filters?.storageLocation) {
			searchParams.append('storageLocation', filters.storageLocation);
		}

		if (filters?.expiringWithinDays !== undefined) {
			searchParams.append(
				'expiringWithinDays',
				filters.expiringWithinDays.toString()
			);
		}

		const queryString = searchParams.toString();
		const endpoint = `/inventory${queryString ? `?${queryString}` : ''}`;

		return await apiClient.get<InventoryItemResponse[]>(endpoint);
	},

	/**
	 * Ajoute un produit manuellement à l'inventaire
	 */
	async addManualProduct(
		productData: AddManualProductInput
	): Promise<ProductCreatedResponse> {
		return await apiClient.post<ProductCreatedResponse>(
			'/inventory/products',
			productData
		);
	},

	/**
	 * Met à jour un élément d'inventaire
	 */
	async updateInventoryItem(
		inventoryItemId: string,
		updates: UpdateInventoryItemInput
	): Promise<InventoryItemResponse> {
		return await apiClient.put<InventoryItemResponse>(
			`/inventory/${inventoryItemId}`,
			updates
		);
	},

	/**
	 * Supprime un élément d'inventaire
	 */
	async removeInventoryItem(inventoryItemId: string): Promise<void> {
		return await apiClient.delete<void>(`/inventory/${inventoryItemId}`);
	},

	/**
	 * Recherche des produits dans la base de données
	 * @param query Terme de recherche (minimum 2 caractères)
	 * @param limit Nombre maximum de résultats (défaut: 10)
	 * @returns Liste des produits correspondants
	 */
	async searchProducts(
		query: string,
		limit: number = 10
	): Promise<ProductSearchResult[]> {
		try {
			// Construction manuelle de l'URL avec les paramètres de requête
			const searchParams = new URLSearchParams();
			searchParams.append('q', query);
			searchParams.append('limit', limit.toString());

			const endpoint = `/products/search?${searchParams.toString()}`;

			const response = await apiClient.get<ProductSearchResult[]>(
				endpoint
			);
			return response;
		} catch (error) {
			console.error('Erreur lors de la recherche de produits:', error);
			throw error;
		}
	},

	/**
	 * Récupère un produit par son ID
	 * @param productId ID du produit
	 * @returns Détails du produit
	 */
	async getProductById(productId: string): Promise<ProductSearchResult> {
		try {
			const response = await apiClient.get<ProductSearchResult>(
				`/products/${productId}`
			);
			return response;
		} catch (error) {
			console.error('Erreur lors de la récupération du produit:', error);
			throw error;
		}
	},

	/**
	 * Ajoute rapidement un produit existant à l'inventaire
	 * @param data Données d'ajout rapide
	 * @returns Produit ajouté à l'inventaire
	 */
	async addExistingProductToInventory(
		data: QuickAddFormData
	): Promise<ProductCreatedResponse> {
		try {
			const response = await apiClient.post<ProductCreatedResponse>(
				'/inventory/products/quick-add',
				data
			);
			return response;
		} catch (error) {
			console.error("Erreur lors de l'ajout rapide du produit:", error);
			throw error;
		}
	},

	/**
	 * Récupère la liste des catégories disponibles
	 * @returns Liste des catégories
	 */
	async getCategories(): Promise<Category[]> {
		try {
			const response = await apiClient.get<Category[]>(
				'/products/categories'
			);
			return response;
		} catch (error) {
			console.error(
				'Erreur lors de la récupération des catégories:',
				error
			);
			throw error;
		}
	},

	/**
	 * Récupère les statistiques de l'inventaire
	 */
	async getInventoryStats(): Promise<InventoryStatsResponse> {
		return await apiClient.get<InventoryStatsResponse>('/inventory/stats');
	},

	/**
	 * Récupère les produits récemment ajoutés à l'inventaire
	 * @param limit Nombre de produits à récupérer (défaut: 5)
	 * @returns Liste des produits récents triés par date d'ajout
	 */
	async getRecentProducts(
		limit: number = 5
	): Promise<InventoryItemResponse[]> {
		try {
			const searchParams = new URLSearchParams();
			searchParams.append('limit', limit.toString());

			const endpoint = `/inventory/recent?${searchParams.toString()}`;

			return await apiClient.get<InventoryItemResponse[]>(endpoint);
		} catch (error) {
			console.error(
				'Erreur lors de la récupération des produits récents:',
				error
			);
			throw error;
		}
	},
};
