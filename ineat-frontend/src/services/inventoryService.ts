import { apiClient } from '@/lib/api-client';
import {
	AddManualProductInput,
	AddManualProductFormInput,
	AddManualProductFormInputActual,
	mapFormToApiData,
	ProductCreatedResponse,
	InventoryFilters,
	InventoryStats,
} from '@/schemas/inventorySchema';

// Types pour les réponses de l'API d'inventaire
export interface InventoryItemResponse {
	id: string;
	quantity: number;
	expiryDate: string | null;
	purchaseDate: string;
	purchasePrice: number | null;
	storageLocation: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
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

export interface UpdateInventoryItemInput {
	quantity?: number;
	expiryDate?: string | null;
	storageLocation?: string | null;
	notes?: string | null;
	purchasePrice?: number | null;
}

// Types pour les catégories
export interface Category {
	id: string;
	name: string;
	slug: string;
	icon?: string;
	parentId?: string;
	parent?: Category;
	children?: Category[];
}

// Types pour la recherche de produits
export interface ProductSearchResult {
	id: string;
	name: string;
	brand: string | null;
	nutriscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
	ecoScore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
	imageUrl: string | null;
	unitType: 'KG' | 'G' | 'L' | 'ML' | 'UNIT';
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
	 * Cette fonction gère automatiquement le mapping des données du formulaire vers l'API
	 * Accepte les données soit avec categoryId soit avec category (auto-détection)
	 */
	async addManualProduct(
		formData: AddManualProductFormInput | AddManualProductFormInputActual,
		categories?: Category[]
	): Promise<ProductCreatedResponse> {
		// Validation basique des données reçues
		if (!formData) {
			throw new Error('Les données du formulaire sont manquantes');
		}

		// Vérifier que nous avons soit categoryId soit category
		const hasCategoryId =
			'categoryId' in formData && Boolean(formData.categoryId);
		const hasCategory =
			'category' in formData && Boolean(formData.category);

		if (!hasCategoryId && !hasCategory) {
			throw new Error(
				'L\'ID de catégorie est requis. Le formulaire doit contenir soit "categoryId" soit "category".'
			);
		}

		// Si les catégories ne sont pas fournies, les récupérer
		let categoriesList = categories;
		if (!categoriesList) {
			categoriesList = await inventoryService.getCategories();
		}

		if (!categoriesList || categoriesList.length === 0) {
			throw new Error(
				'Aucune catégorie disponible. Impossible de mapper les données.'
			);
		}

		// Mapper les données du formulaire vers le format attendu par l'API
		const apiData: AddManualProductInput = mapFormToApiData(
			formData,
			categoriesList
		);

		// Appel à l'API avec les données correctement formatées
		const response = await apiClient.post<ProductCreatedResponse>(
			'/inventory/products',
			apiData
		);

		return response;
	},

	/**
	 * Version alternative pour les cas où on a déjà les données au bon format
	 */
	async addManualProductDirect(
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
	async getProductById(productId: string): Promise<ProductSearchResult> {
		return await apiClient.get<ProductSearchResult>(
			`/products/${productId}`
		);
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
	): Promise<InventoryItemResponse[]> {
		const searchParams = new URLSearchParams();
		searchParams.append('limit', limit.toString());

		const endpoint = `/inventory/recent?${searchParams.toString()}`;

		return await apiClient.get<InventoryItemResponse[]>(endpoint);
	},
};
