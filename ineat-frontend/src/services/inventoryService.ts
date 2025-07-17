import { apiClient } from '@/lib/api-client';
import {
	AddInventoryItemData,
	ProductCreatedResponse,
	InventoryFilters,
	InventoryStats,
	InventoryItem,
	Category,
	Product,
	UpdateInventoryItemData,
} from '@/schemas';

// Types spécifiques au service (pas dans les schémas)
export interface ProductSearchResult {
	id: string;
	name: string;
	brand?: string;
	nutriscore?: 'A' | 'B' | 'C' | 'D' | 'E';
	ecoScore?: 'A' | 'B' | 'C' | 'D' | 'E';
	imageUrl?: string;
	unitType: 'KG' | 'G' | 'L' | 'ML' | 'UNIT';
	barcode?: string;
	category: {
		id: string;
		name: string;
		slug: string;
		icon?: string;
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

// Type pour les réponses d'API (version simplifiée d'InventoryItem)
export type InventoryItemResponse = InventoryItem;

// Type pour les mises à jour (version simplifiée)
export type UpdateInventoryItemInput = UpdateInventoryItemData;

/**
 * Service pour gérer les opérations d'inventaire
 */
export const inventoryService = {
	/**
	 * Récupère l'inventaire complet de l'utilisateur avec filtres optionnels
	 */
	async getInventory(
		filters?: InventoryFilters
	): Promise<InventoryItem[]> {
		const searchParams = new URLSearchParams();

		if (filters?.categoryId) {
			searchParams.append('category', filters.categoryId);
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

		return await apiClient.get<InventoryItem[]>(endpoint);
	},

	/**
	 * Ajoute un produit manuellement à l'inventaire
	 */
	async addManualProduct(
		productData: AddInventoryItemData
	): Promise<ProductCreatedResponse> {
		// Validation basique des données reçues
		if (!productData) {
			throw new Error('Les données du produit sont manquantes');
		}

		if (!productData.productName?.trim()) {
			throw new Error('Le nom du produit est requis');
		}

		if (!productData.category) {
			throw new Error('La catégorie est requise');
		}

		if (!productData.quantity || productData.quantity <= 0) {
			throw new Error('La quantité doit être supérieure à 0');
		}

		// Appel à l'API
		const response = await apiClient.post<ProductCreatedResponse>(
			'/inventory/products',
			productData
		);

		return response;
	},

	/**
	 * Met à jour un élément d'inventaire
	 */
	async updateInventoryItem(
		inventoryItemId: string,
		updates: UpdateInventoryItemData
	): Promise<InventoryItem> {
		return await apiClient.put<InventoryItem>(
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
		const searchParams = new URLSearchParams();
		searchParams.append('q', query);
		searchParams.append('limit', limit.toString());

		const endpoint = `/products/search?${searchParams.toString()}`;

		return await apiClient.get<ProductSearchResult[]>(endpoint);
	},

	/**
	 * Récupère un produit par son ID
	 * @param productId ID du produit
	 * @returns Détails du produit
	 */
	async getProductById(productId: string): Promise<Product> {
		return await apiClient.get<Product>(`/products/${productId}`);
	},

	/**
	 * Ajoute rapidement un produit existant à l'inventaire
	 * @param data Données d'ajout rapide
	 * @returns Produit ajouté à l'inventaire
	 */
	async addExistingProductToInventory(
		data: QuickAddFormData
	): Promise<ProductCreatedResponse> {
		return await apiClient.post<ProductCreatedResponse>(
			'/inventory/products/quick-add',
			data
		);
	},

	/**
	 * Récupère la liste des catégories disponibles
	 * @returns Liste des catégories
	 */
	async getCategories(): Promise<Category[]> {
		return await apiClient.get<Category[]>('/products/categories');
	},

	/**
	 * Récupère les statistiques de l'inventaire
	 */
	async getInventoryStats(): Promise<InventoryStats> {
		return await apiClient.get<InventoryStats>('/inventory/stats');
	},

	/**
	 * Récupère les produits récemment ajoutés à l'inventaire
	 * @param limit Nombre de produits à récupérer (défaut: 5)
	 * @returns Liste des produits récents triés par date d'ajout
	 */
	async getRecentProducts(
		limit: number = 5
	): Promise<InventoryItem[]> {
		const searchParams = new URLSearchParams();
		searchParams.append('limit', limit.toString());

		const endpoint = `/inventory/recent?${searchParams.toString()}`;

		return await apiClient.get<InventoryItem[]>(endpoint);
	},
};