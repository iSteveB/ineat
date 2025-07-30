import { apiClient } from '@/lib/api-client';
import {
	AddInventoryItemData,
	InventoryFilters,
	InventoryStats,
	InventoryItem,
	Category,
	Product,
	UpdateInventoryItemData,
	AddProductResponse,
	hasBudgetImpact,
	// extractNotificationData, // SUPPRIMÉ - utilisation de notre version défensive
} from '@/schemas';

// Import du type InventoryItem pour le cast dans extractNotificationDataDefensive

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

// ===== TYPES DE RÉPONSES ENRICHIES =====

/**
 * Réponse complète d'ajout de produit avec informations budgétaires
 */
export interface ProductAddedWithBudgetResult {
	productName: string;
	message: string;
	type: 'success' | 'info' | 'warning';
	shouldRefreshBudget: boolean;
	budgetInfo: {
		expenseCreated: boolean;
		budgetId?: string;
		remainingBudget?: number;
	};
	item: InventoryItem;
}

/**
 * Service pour gérer les opérations d'inventaire
 */
export const inventoryService = {
	/**
	 * Récupère l'inventaire complet de l'utilisateur avec filtres optionnels
	 */
	async getInventory(filters?: InventoryFilters): Promise<InventoryItem[]> {
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
	 * Retourne maintenant les informations budgétaires enrichies
	 */
	async addManualProduct(
		productData: AddInventoryItemData
	): Promise<ProductAddedWithBudgetResult> {
		// Validation basique des données reçues
		if (!productData) {
			throw new Error('Les données du produit sont manquantes');
		}

		// CORRECTION : Utiliser 'name' au lieu de 'productName'
		if (!productData.name?.trim()) {
			throw new Error('Le nom du produit est requis');
		}

		if (!productData.category) {
			throw new Error('La catégorie est requise');
		}

		if (!productData.quantity || productData.quantity <= 0) {
			throw new Error('La quantité doit être supérieure à 0');
		}

		// Debug des données envoyées
		console.log('Service - Données à envoyer:', productData);

		// Appel à l'API avec les nouvelles réponses enrichies
		// CORRECTION POTENTIELLE : L'endpoint pourrait être /inventory/items au lieu de /inventory/products
		try {
			const response = await apiClient.post<AddProductResponse>(
				'/inventory/items',
				productData
			);

			console.log('Service - Réponse reçue:', response);
			console.log('Service - Structure response.data:', response.data);

			// Vérifier si la réponse contient des informations budgétaires
			if (hasBudgetImpact(response)) {
				console.log('Service - Réponse avec budget détectée');
				console.log(
					'Service - response.data.item:',
					response.data.item
				);
				console.log(
					'Service - response.data.budget:',
					response.data.budget
				);

				// Réponse enrichie avec budget - UTILISER LA VERSION DÉFENSIVE
				const notificationData = extractNotificationDataDefensive(
					response,
					productData.name // CORRECTION : Utiliser 'name'
				);

				return {
					productName: notificationData.productName,
					message: notificationData.message,
					type: notificationData.type,
					shouldRefreshBudget: notificationData.shouldRefreshBudget,
					budgetInfo: notificationData.budgetInfo,
					item: notificationData.item,
				};
			} else {
				console.log('Service - Réponse classique sans budget');
				// Réponse classique sans budget (fallback)
				return {
					productName: productData.name, // CORRECTION : Utiliser 'name'
					message: `${productData.name} ajouté à l'inventaire`, // CORRECTION : Utiliser 'name'
					type: 'success' as const,
					shouldRefreshBudget: false,
					budgetInfo: {
						expenseCreated: false,
					},
					item: response.data,
				};
			}
		} catch (error) {
			console.error("Service - Erreur lors de l'ajout:", error);
			// Fallback - essayer l'ancien endpoint
			try {
				console.log(
					"Service - Tentative avec l'endpoint /inventory/products"
				);
				const response = await apiClient.post<AddProductResponse>(
					'/inventory/products',
					productData
				);

				console.log('Service - Réponse reçue (fallback):', response);
				console.log(
					'Service - Structure response.data (fallback):',
					response.data
				);

				// Même logique que ci-dessus
				if (hasBudgetImpact(response)) {
					console.log(
						'Service - Réponse avec budget détectée (fallback)'
					);
					const notificationData = extractNotificationDataDefensive(
						response,
						productData.name
					);

					return {
						productName: notificationData.productName,
						message: notificationData.message,
						type: notificationData.type,
						shouldRefreshBudget:
							notificationData.shouldRefreshBudget,
						budgetInfo: notificationData.budgetInfo,
						item: notificationData.item,
					};
				} else {
					console.log(
						'Service - Réponse classique sans budget (fallback)'
					);
					return {
						productName: productData.name,
						message: `${productData.name} ajouté à l'inventaire`,
						type: 'success' as const,
						shouldRefreshBudget: false,
						budgetInfo: {
							expenseCreated: false,
						},
						item: response.data,
					};
				}
			} catch (fallbackError) {
				console.error(
					'Service - Erreur avec les deux endpoints:',
					fallbackError
				);
				throw fallbackError;
			}
		}
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
	 * Retourne maintenant les informations budgétaires enrichies
	 * @param data Données d'ajout rapide
	 * @returns Produit ajouté avec feedback budgétaire
	 */
	async addExistingProductToInventory(
		data: QuickAddFormData
	): Promise<ProductAddedWithBudgetResult> {
		// Validation des données
		if (!data.productId) {
			throw new Error("L'ID du produit est requis");
		}

		if (!data.quantity || data.quantity <= 0) {
			throw new Error('La quantité doit être supérieure à 0');
		}

		// Appel à l'API avec les nouvelles réponses enrichies
		const response = await apiClient.post<AddProductResponse>(
			'/inventory/products/quick-add',
			data
		);

		// Vérifier si la réponse contient des informations budgétaires
		if (hasBudgetImpact(response)) {
			// Réponse enrichie avec budget - UTILISER LA VERSION DÉFENSIVE
			const notificationData = extractNotificationDataDefensive(response);

			return {
				productName: notificationData.productName,
				message: notificationData.message,
				type: notificationData.type,
				shouldRefreshBudget: notificationData.shouldRefreshBudget,
				budgetInfo: notificationData.budgetInfo,
				item: notificationData.item,
			};
		} else {
			// Réponse classique sans budget (fallback)
			return {
				productName: response.data.product.name,
				message: `${response.data.product.name} ajouté à l'inventaire`,
				type: 'success' as const,
				shouldRefreshBudget: false,
				budgetInfo: {
					expenseCreated: false,
				},
				item: response.data,
			};
		}
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
	async getRecentProducts(limit: number = 5): Promise<InventoryItem[]> {
		const searchParams = new URLSearchParams();
		searchParams.append('limit', limit.toString());

		const endpoint = `/inventory/recent?${searchParams.toString()}`;

		return await apiClient.get<InventoryItem[]>(endpoint);
	},
};

// ===== TYPES POUR LA GESTION DÉFENSIVE =====

interface UnknownBudgetData {
	expenseCreated?: boolean;
	message?: string;
	budgetId?: string;
	remainingBudget?: number;
}

interface UnknownItemData {
	name?: string;
	product?: {
		name?: string;
	};
}

interface UnknownResponseData {
	item?: UnknownItemData;
	budget?: UnknownBudgetData;
	name?: string;
}

interface UnknownApiResponse {
	data?: UnknownResponseData;
	item?: UnknownItemData;
	budget?: UnknownBudgetData;
	name?: string;
}

// ===== UTILITAIRES D'EXTRACTION (VERSION DÉFENSIVE) =====

/**
 * Extrait les informations de notification depuis une réponse enrichie
 * Version défensive qui gère les cas où la structure n'est pas exactement celle attendue
 */
export const extractNotificationDataDefensive = (
	response: UnknownApiResponse,
	fallbackProductName: string = 'Produit'
) => {
	console.log('extractNotificationData - Réponse reçue:', response);
	console.log('extractNotificationData - response.data:', response.data);

	const responseData = response.data || response;
	const { item, budget } = responseData;

	console.log('extractNotificationData - item:', item);
	console.log('extractNotificationData - budget:', budget);

	// Défense contre les structures de données inattendues
	let productName = fallbackProductName;

	// Vérifier si item existe et a la structure attendue
	if (item) {
		if (item.product?.name) {
			// Structure classique: item.product.name
			productName = item.product.name;
		} else if (item.name) {
			// Structure alternative: item.name directement
			productName = item.name;
		} else {
			console.warn(
				'extractNotificationData - Structure item inattendue:',
				item
			);
		}
	} else if (responseData.name) {
		// Fallback: le nom directement dans responseData
		productName = responseData.name;
	} else {
		console.warn(
			'extractNotificationData - item est undefined dans la réponse'
		);
	}

	// Défense pour budget - si pas de structure budget, retourner une réponse simple
	if (!budget) {
		console.log('extractNotificationData - Pas de budget, réponse simple');
		return {
			productName,
			message: `${productName} ajouté avec succès`,
			type: 'success' as const,
			shouldRefreshBudget: false,
			budgetInfo: {
				expenseCreated: false,
			},
			item: (item || responseData) as InventoryItem, // Cast explicite vers InventoryItem
		};
	}

	// Helper typé pour le type de notification
	const getNotificationType = (
		budgetData: UnknownBudgetData
	): 'success' | 'info' | 'warning' => {
		if (budgetData.expenseCreated) {
			if (
				budgetData.remainingBudget !== undefined &&
				budgetData.remainingBudget < 0
			) {
				return 'warning'; // Budget dépassé
			}
			return 'info'; // Dépense créée
		}

		return 'success'; // Par défaut
	};

	return {
		productName,
		message: budget.message || `${productName} ajouté avec succès`,
		type: getNotificationType(budget),
		shouldRefreshBudget: budget.expenseCreated || false,
		budgetInfo: {
			expenseCreated: budget.expenseCreated || false,
			budgetId: budget.budgetId,
			remainingBudget: budget.remainingBudget,
		},
		item: (item || responseData) as InventoryItem, // Cast explicite vers InventoryItem
	};
};
