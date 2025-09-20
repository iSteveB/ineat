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
} from '@/schemas';

// Types spécifiques au service (pas dans les schémas) - ENRICHIS avec nouveaux champs
export interface ProductSearchResult {
	id: string;
	name: string;
	brand?: string;
	nutriscore?: 'A' | 'B' | 'C' | 'D' | 'E';
	ecoscore?: 'A' | 'B' | 'C' | 'D' | 'E';
	novascore?: 'GROUP_1' | 'GROUP_2' | 'GROUP_3' | 'GROUP_4'; // NOUVEAU
	imageUrl?: string;
	unitType: 'KG' | 'G' | 'L' | 'ML' | 'UNIT';
	barcode?: string;

	// Nutrition
	nutrients?: {
		energy?: number;
		proteins?: number;
		carbohydrates?: number;
		fats?: number;
		sugars?: number;
		fiber?: number;
		salt?: number;
		saturatedFats?: number;
	};

	// Contenu
	ingredients?: string;

	category: {
		id: string;
		name: string;
		slug: string;
		icon?: string;
	};
	relevanceScore?: number;
}

// Type pour QuickAdd de produits existants (sans category)
export interface QuickAddFormData {
	productId: string;
	quantity: number;
	expiryDate?: string;
	purchaseDate: string;
	purchasePrice?: number;
	storageLocation?: string;
	notes?: string;
}

// Type pour QuickAdd avec création de produit (avec category) - ENRICHI
export interface QuickAddFormDataWithCategory {
	quantity: number;
	category: string; // Obligatoire pour créer un nouveau produit
	expiryDate?: string;
	purchaseDate: string;
	purchasePrice?: number;
	storageLocation?: string;
	notes?: string;

	// Création rapide avec données enrichies
	nutriscore?: 'A' | 'B' | 'C' | 'D' | 'E';
	ecoscore?: 'A' | 'B' | 'C' | 'D' | 'E';
	novascore?: 'GROUP_1' | 'GROUP_2' | 'GROUP_3' | 'GROUP_4';
	nutrients?: {
		energy?: number;
		proteins?: number;
		carbohydrates?: number;
		fats?: number;
		sugars?: number;
		fiber?: number;
		salt?: number;
		saturatedFats?: number;
	};
	imageUrl?: string;
	ingredients?: string;
}

// Type pour les réponses d'API (version simplifiée d'InventoryItem)
export type InventoryItemResponse = InventoryItem;

// Type pour les mises à jour (version simplifiée)
export type UpdateInventoryItemInput = UpdateInventoryItemData;

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

// Types pour la gestion défensive des réponses API
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
		nutriscore?: string;
		ecoscore?: string;
		novascore?: string;
		imageUrl?: string;
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

/**
 * Extrait les informations de notification depuis une réponse enrichie
 * Version défensive qui gère les cas où la structure n'est pas exactement celle attendue
 */
export const extractNotificationDataDefensive = (
	response: UnknownApiResponse,
	fallbackProductName: string = 'Produit'
) => {
	const responseData = response.data || response;
	const { item, budget } = responseData;

	// Défense contre les structures de données inattendues
	let productName = fallbackProductName;

	if (item) {
		if (item.product?.name) {
			productName = item.product.name;
		} else if (item.name) {
			productName = item.name;
		}
	} else if (responseData.name) {
		productName = responseData.name;
	}

	// Si pas de structure budget, retourner une réponse simple
	if (!budget) {
		return {
			productName,
			message: `${productName} ajouté avec succès`,
			type: 'success' as const,
			shouldRefreshBudget: false,
			budgetInfo: {
				expenseCreated: false,
			},
			item: (item || responseData) as InventoryItem,
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
		item: (item || responseData) as InventoryItem,
	};
};

/**
 * Service pour gérer les opérations d'inventaire
 */
export const inventoryService = {
	/**
	 * Récupère l'inventaire complet de l'utilisateur avec filtres optionnels
	 * ENRICHI - Support des nouveaux filtres par scores nutritionnels
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

		// FILTRES pour les scores (si disponibles dans InventoryFilters)
		// Note: Ces filtres peuvent être ajoutés si le schéma InventoryFilters les supporte

		const queryString = searchParams.toString();
		const endpoint = `/inventory${queryString ? `?${queryString}` : ''}`;

		return await apiClient.get<InventoryItem[]>(endpoint);
	},

	/**
	 * Ajoute un produit manuellement à l'inventaire
	 * ENRICHI - Support complet des nouveaux champs nutritionnels et environnementaux
	 * Utilisé pour créer un nouveau produit (scan + OpenFoodFacts ou saisie complète)
	 * Retourne les informations budgétaires enrichies
	 */
	async addManualProduct(
		productData: AddInventoryItemData
	): Promise<ProductAddedWithBudgetResult> {
		// Validation basique des données reçues
		if (!productData) {
			throw new Error('Les données du produit sont manquantes');
		}

		if (!productData.name?.trim()) {
			throw new Error('Le nom du produit est requis');
		}

		if (!productData.category) {
			throw new Error('La catégorie est requise');
		}

		if (!productData.quantity || productData.quantity <= 0) {
			throw new Error('La quantité doit être supérieure à 0');
		}

		// Vérification des nouveaux champs
		if (productData.nutrients) {
			// Validation optionnelle des valeurs nutritionnelles
			Object.entries(productData.nutrients).forEach(([key, value]) => {
				if (typeof value === 'number' && value < 0) {
					throw new Error(
						`La valeur nutritionnelle ${key} ne peut pas être négative`
					);
				}
			});
		}

		if (productData.imageUrl && !isValidUrl(productData.imageUrl)) {
			throw new Error("URL d'image invalide");
		}

		const response = await apiClient.post<AddProductResponse>(
			'/inventory/products',
			productData
		);

		// Vérifier si la réponse contient des informations budgétaires
		if (hasBudgetImpact(response)) {
			const notificationData = extractNotificationDataDefensive(
				response,
				productData.name
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
			// Réponse classique sans budget (fallback)
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
	},

	/**
	 * Ajoute rapidement un produit existant à l'inventaire
	 * Utilisé quand le produit existe déjà dans la base locale
	 * Retourne les informations budgétaires enrichies
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

		const response = await apiClient.post<AddProductResponse>(
			'/inventory/products/quick-add',
			data
		);

		// Vérifier si la réponse contient des informations budgétaires
		if (hasBudgetImpact(response)) {
			const notificationData = extractNotificationDataDefensive(
				response,
				'Produit'
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
			// Réponse classique sans budget (fallback)
			return {
				productName: response.data.product?.name || 'Produit',
				message: `${
					response.data.product?.name || 'Produit'
				} ajouté à l'inventaire`,
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
	 * ENRICHI - Les résultats incluent maintenant les nouveaux champs nutritionnels
	 * @param query Terme de recherche (minimum 2 caractères)
	 * @param limit Nombre maximum de résultats (défaut: 10)
	 * @param includeNutritionalData Inclure les données nutritionnelles dans les résultats
	 * @returns Liste des produits correspondants avec données enrichies
	 */
	async searchProducts(
		query: string,
		limit: number = 10,
		includeNutritionalData: boolean = true
	): Promise<ProductSearchResult[]> {
		const searchParams = new URLSearchParams();
		searchParams.append('q', query);
		searchParams.append('limit', limit.toString());

		if (includeNutritionalData) {
			searchParams.append('includeNutritionalData', 'true');
		}

		const endpoint = `/products/search?${searchParams.toString()}`;

		return await apiClient.get<ProductSearchResult[]>(endpoint);
	},

	/**
	 * Recherche des produits par score nutritionnel
	 * NOUVEAU - Permet de filtrer par Nutri-Score, Eco-Score, ou Nova-Score
	 * @param scoreType Type de score ('nutriscore' | 'ecoscore' | 'novascore')
	 * @param scoreValue Valeur du score recherchée
	 * @param limit Nombre maximum de résultats
	 * @returns Liste des produits correspondants
	 */
	async searchProductsByScore(
		scoreType: 'nutriscore' | 'ecoscore' | 'novascore',
		scoreValue: string,
		limit: number = 20
	): Promise<ProductSearchResult[]> {
		const searchParams = new URLSearchParams();
		searchParams.append('scoreType', scoreType);
		searchParams.append('scoreValue', scoreValue);
		searchParams.append('limit', limit.toString());

		const endpoint = `/products/search/by-score?${searchParams.toString()}`;

		return await apiClient.get<ProductSearchResult[]>(endpoint);
	},

	/**
	 * Récupère un produit par son ID
	 * @param productId ID du produit
	 * @returns Détails du produit avec toutes les données enrichies
	 */
	async getProductById(productId: string): Promise<Product> {
		return await apiClient.get<Product>(`/products/${productId}`);
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
	 * ENRICHI - Peut inclure des statistiques sur les scores nutritionnels
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

	/**
	 * Récupère des suggestions nutritionnelles basées sur l'inventaire
	 * Analyse l'inventaire actuel et propose des améliorations nutritionnelles
	 * @returns Suggestions d'amélioration nutritionnelle
	 */
	async getNutritionalSuggestions(): Promise<{
		recommendations: Array<{
			type: 'nutriscore' | 'ecoscore' | 'nova' | 'balance';
			message: string;
			priority: 'low' | 'medium' | 'high';
			suggestedProducts?: ProductSearchResult[];
		}>;
		currentProfile: {
			averageNutriscore?: string;
			averageEcoscore?: string;
			ultraProcessedPercentage?: number;
		};
	}> {
		return await apiClient.get('/inventory/nutritional-suggestions');
	},
};

/**
 * Validation d'URL
 * @param urlString URL à valider
 * @returns true si l'URL est valide
 */
function isValidUrl(urlString: string): boolean {
	try {
		new URL(urlString);
		return true;
	} catch {
		return false;
	}
}

/**
 * Formatage des scores pour l'affichage
 * @param score Score à formater
 * @param scoreType Type de score
 * @returns Score formaté avec label
 */
export function formatScoreForDisplay(
	score: string | undefined,
	scoreType: 'nutriscore' | 'ecoscore' | 'novascore'
): string | null {
	if (!score) return null;

	switch (scoreType) {
		case 'nutriscore':
		case 'ecoscore':
			return score.toUpperCase(); // A, B, C, D, E

		case 'novascore': {
			const novaLabels = {
				GROUP_1: '1 - Non transformés',
				GROUP_2: '2 - Ingrédients transformés',
				GROUP_3: '3 - Transformés',
				GROUP_4: '4 - Ultra-transformés',
			};
			return novaLabels[score as keyof typeof novaLabels] || score;
		}

		default:
			return score;
	}
}

/**
 * Calcul de la qualité nutritionnelle globale
 * @param product Produit avec ses scores
 * @returns Score de qualité global (0-100)
 */
export function calculateOverallNutritionalQuality(product: {
	nutriscore?: string;
	ecoscore?: string;
	novascore?: string;
}): number {
	let score = 50; // Score de base

	// Nutri-Score (30% du poids)
	if (product.nutriscore) {
		const nutriscoreValues = { A: 100, B: 80, C: 60, D: 40, E: 20 };
		score +=
			(nutriscoreValues[
				product.nutriscore as keyof typeof nutriscoreValues
			] -
				50) *
			0.3;
	}

	// Eco-Score (20% du poids)
	if (product.ecoscore) {
		const ecoscoreValues = { A: 100, B: 80, C: 60, D: 40, E: 20 };
		score +=
			(ecoscoreValues[product.ecoscore as keyof typeof ecoscoreValues] -
				50) *
			0.2;
	}

	// Nova-Score (20% du poids, inversé car plus c'est bas, mieux c'est)
	if (product.novascore) {
		const novaValues = {
			GROUP_1: 100,
			GROUP_2: 75,
			GROUP_3: 50,
			GROUP_4: 25,
		};
		score +=
			(novaValues[product.novascore as keyof typeof novaValues] - 50) *
			0.2;
	}

	return Math.max(0, Math.min(100, Math.round(score)));
}
