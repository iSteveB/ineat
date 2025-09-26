import { z } from 'zod';
import {
	UuidSchema,
	DateInputSchema,
	QuantitySchema,
	PriceSchema,
	MediumTextSchema,
	ExpiryStatusSchema,
	calculateExpiryStatus,
} from './base';
import {
	TimestampsSchema,
	ApiSuccessResponseSchema,
	PaginatedResponseSchema,
	DateRangeFilterSchema,
	SearchFilterSchema,
} from './common';
import { ProductSchema, ProductSummarySchema } from './product';
import { getBudgetNotificationType } from './budget';

// ===== SCHÉMA ÉLÉMENT D'INVENTAIRE =====

export const InventoryItemSchema = z
	.object({
		id: UuidSchema,
		userId: UuidSchema,
		product: ProductSchema,
		quantity: QuantitySchema,
		expiryDate: z.string().datetime().optional(),
		purchaseDate: z.string().datetime(),
		purchasePrice: PriceSchema.optional(),
		storageLocation: z
			.string()
			.max(50, 'Le lieu de stockage ne peut pas dépasser 50 caractères')
			.optional(),
		notes: MediumTextSchema.optional(),
	})
	.merge(TimestampsSchema);

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

// Version avec statut d'expiration calculé
export const InventoryItemWithStatusSchema = InventoryItemSchema.extend({
	expiryStatus: ExpiryStatusSchema,
	daysUntilExpiry: z.number().optional(),
});
export type InventoryItemWithStatus = z.infer<
	typeof InventoryItemWithStatusSchema
>;

// ===== SCHÉMAS D'AJOUT À L'INVENTAIRE =====

// Ajout manuel d'un produit à l'inventaire
export const AddInventoryItemSchema = z
	.object({
		// Informations produit (si nouveau produit)
		name: z
			.string()
			.min(1, 'Le nom du produit est obligatoire')
			.max(100, 'Le nom ne peut pas dépasser 100 caractères'),
		brand: z
			.string()
			.max(50, 'La marque ne peut pas dépasser 50 caractères')
			.optional(),
		barcode: z
			.string()
			.regex(
				/^[0-9]{8,13}$/,
				'Le code-barres doit contenir entre 8 et 13 chiffres'
			)
			.optional(),
		category: z.string().min(1, 'La catégorie est obligatoire'), // Slug de la catégorie

		// Scores nutritionnels et environnementaux
		nutriscore: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
		ecoscore: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
		novascore: z.enum(['GROUP_1', 'GROUP_2', 'GROUP_3', 'GROUP_4']).optional(),

		// Informations nutritionnelles (objet JSON)
		nutrients: z.object({
			energy: z.number().min(0).optional(), // kcal pour 100g
			proteins: z.number().min(0).optional(), // g pour 100g
			carbohydrates: z.number().min(0).optional(), // g pour 100g
			fats: z.number().min(0).optional(), // g pour 100g
			sugars: z.number().min(0).optional(), // g pour 100g
			fiber: z.number().min(0).optional(), // g pour 100g
			salt: z.number().min(0).optional(), // g pour 100g
			saturatedFats: z.number().min(0).optional(), // g pour 100g
		}).optional(),

		// Contenu et média
		imageUrl: z.string().url('URL d\'image invalide').optional(),
		ingredients: z.string().max(2000, 'La liste des ingrédients ne peut pas dépasser 2000 caractères').optional(),

		// Informations d'inventaire (existantes)
		quantity: QuantitySchema,
		unitType: z.enum(['KG', 'G', 'L', 'ML', 'UNIT']),
		purchaseDate: DateInputSchema.refine((date) => {
			const parsed = new Date(date);
			const now = new Date();
			now.setHours(23, 59, 59, 999);
			return parsed <= now;
		}, "La date d'achat ne peut pas être dans le futur"),
		expiryDate: DateInputSchema.optional(),
		purchasePrice: PriceSchema.optional(),
		storageLocation: z
			.string()
			.max(50, 'Le lieu de stockage ne peut pas dépasser 50 caractères')
			.optional(),
		notes: MediumTextSchema.optional(),
	})
	.refine(
		(data) => {
			// Validation croisée : date de péremption doit être après la date d'achat
			if (data.expiryDate) {
				const purchaseDate = new Date(data.purchaseDate);
				const expiryDate = new Date(data.expiryDate);
				return expiryDate > purchaseDate;
			}
			return true;
		},
		{
			message:
				"La date de péremption doit être postérieure à la date d'achat",
			path: ['expiryDate'],
		}
	);

export type AddInventoryItemData = z.infer<typeof AddInventoryItemSchema>;

// Ajout d'un produit existant à l'inventaire
export const AddExistingProductToInventorySchema = z
	.object({
		productId: UuidSchema,
		quantity: QuantitySchema,
		purchaseDate: DateInputSchema.refine((date) => {
			const parsed = new Date(date);
			const now = new Date();
			now.setHours(23, 59, 59, 999);
			return parsed <= now;
		}, "La date d'achat ne peut pas être dans le futur"),
		expiryDate: DateInputSchema.optional(),
		purchasePrice: PriceSchema.optional(),
		storageLocation: z
			.string()
			.max(50, 'Le lieu de stockage ne peut pas dépasser 50 caractères')
			.optional(),
		notes: MediumTextSchema.optional(),
	})
	.refine(
		(data) => {
			if (data.expiryDate) {
				const purchaseDate = new Date(data.purchaseDate);
				const expiryDate = new Date(data.expiryDate);
				return expiryDate > purchaseDate;
			}
			return true;
		},
		{
			message:
				"La date de péremption doit être postérieure à la date d'achat",
			path: ['expiryDate'],
		}
	);

export type AddExistingProductToInventoryData = z.infer<
	typeof AddExistingProductToInventorySchema
>;

// ===== SCHÉMAS DE MISE À JOUR =====

export const UpdateInventoryItemSchema = z.object({
	quantity: QuantitySchema.optional(),
	expiryDate: DateInputSchema.optional(),
	purchasePrice: PriceSchema.optional(),
	storageLocation: z
		.string()
		.max(50, 'Le lieu de stockage ne peut pas dépasser 50 caractères')
		.optional(),
	notes: MediumTextSchema.optional(),
});
export type UpdateInventoryItemData = z.infer<typeof UpdateInventoryItemSchema>;

// Consommation d'un produit
export const ConsumeInventoryItemSchema = z.object({
	quantityConsumed: QuantitySchema,
	notes: z
		.string()
		.max(200, 'Les notes ne peuvent pas dépasser 200 caractères')
		.optional(),
});
export type ConsumeInventoryItemData = z.infer<
	typeof ConsumeInventoryItemSchema
>;

// ===== SCHÉMAS DE FILTRAGE =====

// Type pour les filtres de localisation de stockage
export const StorageLocationFilterSchema = z.enum([
	'ALL',
	'FRESH',
	'FREEZER',
	'PANTRY',
]);
export type StorageLocationFilter = z.infer<typeof StorageLocationFilterSchema>;

export const InventoryFiltersSchema = z.object({
	search: SearchFilterSchema.optional(),
	categoryId: UuidSchema.optional(),
	storageLocation: z.string().optional(),
	expiryStatus: z.array(ExpiryStatusSchema).optional(),
	expiringWithinDays: z.coerce.number().int().min(1).max(365).optional(),
	dateRange: DateRangeFilterSchema.optional(),
	priceRange: z
		.object({
			min: PriceSchema.optional(),
			max: PriceSchema.optional(),
		})
		.optional(),
	hasNotes: z.boolean().optional(),
});
export type InventoryFilters = z.infer<typeof InventoryFiltersSchema>;

// ===== SCHÉMAS DE STATISTIQUES =====

export const InventoryStatsSchema = z.object({
	totalItems: z.number().int().min(0),
	totalValue: z.number().min(0),
	totalQuantity: z.number().min(0),
	averageItemValue: z.number().min(0),

	// Répartition par statut d'expiration
	expiryBreakdown: z.object({
		good: z.number().int().min(0),
		warning: z.number().int().min(0),
		critical: z.number().int().min(0),
		expired: z.number().int().min(0),
		unknown: z.number().int().min(0),
	}),

	// Répartition par catégorie
	categoryBreakdown: z.array(
		z.object({
			categoryId: UuidSchema,
			categoryName: z.string(),
			count: z.number().int().min(0),
			percentage: z.number().min(0).max(100),
			totalValue: z.number().min(0),
		})
	),

	// Répartition par lieu de stockage
	storageBreakdown: z.record(
		z.string(),
		z.object({
			count: z.number().int().min(0),
			percentage: z.number().min(0).max(100),
		})
	),

	// Évolution récente
	recentActivity: z.object({
		itemsAddedThisWeek: z.number().int().min(0),
		itemsConsumedThisWeek: z.number().int().min(0),
		averageDaysToConsumption: z.number().min(0).optional(),
	}),
});
export type InventoryStats = z.infer<typeof InventoryStatsSchema>;

// ===== SCHÉMAS DE RÉPONSES API CLASSIQUES =====

export const InventoryItemResponseSchema = ApiSuccessResponseSchema(
	InventoryItemWithStatusSchema
);
export type InventoryItemResponse = z.infer<typeof InventoryItemResponseSchema>;

export const InventoryListResponseSchema = ApiSuccessResponseSchema(
	PaginatedResponseSchema(InventoryItemWithStatusSchema)
);
export type InventoryListResponse = z.infer<typeof InventoryListResponseSchema>;

export const InventoryStatsResponseSchema =
	ApiSuccessResponseSchema(InventoryStatsSchema);
export type InventoryStatsResponse = z.infer<
	typeof InventoryStatsResponseSchema
>;

// ===== SCHÉMAS DE RÉPONSES ENRICHIES AVEC BUDGET =====

/**
 * Réponse enrichie d'ajout de produit avec feedback budgétaire
 * Remplace ProductCreatedResponse pour les endpoints modifiés
 */
export const InventoryItemWithBudgetSchema = z.object({
	item: InventoryItemWithStatusSchema,
	budget: z.object({
		expenseCreated: z.boolean(),
		message: z.string(),
		budgetId: UuidSchema.optional(),
		remainingBudget: PriceSchema.optional(),
	}),
});

export type InventoryItemWithBudget = z.infer<
	typeof InventoryItemWithBudgetSchema
>;

/**
 * Réponse API complète pour l'ajout de produit avec budget
 */
export const InventoryItemWithBudgetResponseSchema = ApiSuccessResponseSchema(
	InventoryItemWithBudgetSchema
);

export type InventoryItemWithBudgetResponse = z.infer<
	typeof InventoryItemWithBudgetResponseSchema
>;

// ===== TYPES D'UNION POUR COMPATIBILITÉ =====

/**
 * Type union pour les réponses d'ajout de produit (avec ou sans budget)
 * Permet une transition progressive si nécessaire
 */
export type AddProductResponse =
	| InventoryItemWithBudgetResponse
	| InventoryItemResponse;

// ===== GUARDS DE TYPE =====

/**
 * Vérifie si une réponse contient des informations budgétaires
 */
export const hasBudgetImpact = (
	response: AddProductResponse
): response is InventoryItemWithBudgetResponse => {
	return 'budget' in response.data;
};

// ===== UTILITAIRES D'EXTRACTION =====

/**
 * Extrait les informations de notification depuis une réponse enrichie
 */
export const extractNotificationData = (
	response: InventoryItemWithBudgetResponse,
	fallbackProductName: string = 'Produit'
) => {
	const { item, budget } = response.data;
	const productName = item.product.name || fallbackProductName;

	return {
		productName,
		message: budget.message,
		type: getBudgetNotificationType(budget),
		shouldRefreshBudget: budget.expenseCreated,
		budgetInfo: {
			expenseCreated: budget.expenseCreated,
			budgetId: budget.budgetId,
			remainingBudget: budget.remainingBudget,
		},
		item,
	};
};

// ===== SCHÉMAS D'IMPORT =====

// Import de ticket de caisse OCR
export const TicketImportSchema = z.object({
	imageBase64: z.string().min(1, "L'image est requise"),
	storeInfo: z
		.object({
			name: z.string().optional(),
			location: z.string().optional(),
		})
		.optional(),
});
export type TicketImportData = z.infer<typeof TicketImportSchema>;

// Résultat d'analyse de ticket
export const TicketAnalysisResultSchema = z.object({
	items: z.array(
		z.object({
			name: z.string(),
			quantity: z.number().optional(),
			unitPrice: z.number().optional(),
			totalPrice: z.number().optional(),
			confidence: z.number().min(0).max(1), // Niveau de confiance de l'OCR
			suggestedCategory: z.string().optional(),
			suggestedProduct: ProductSummarySchema.optional(),
		})
	),
	purchaseDate: z.string().datetime().optional(),
	totalAmount: z.number().optional(),
	storeInfo: z
		.object({
			name: z.string().optional(),
			location: z.string().optional(),
		})
		.optional(),
});
export type TicketAnalysisResult = z.infer<typeof TicketAnalysisResultSchema>;

// ===== UTILITAIRES =====

/**
 * Ajoute le statut d'expiration à un élément d'inventaire
 */
export const addExpiryStatusToItem = (
	item: InventoryItem
): InventoryItemWithStatus => {
	const expiryStatus = calculateExpiryStatus(item.expiryDate);
	let daysUntilExpiry: number | undefined;

	if (item.expiryDate) {
		const expiry = new Date(item.expiryDate);
		const today = new Date();
		const diffInMs = expiry.getTime() - today.getTime();
		daysUntilExpiry = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
	}

	return {
		...item,
		expiryStatus,
		daysUntilExpiry,
	};
};

/**
 * Filtre les éléments d'inventaire selon les critères donnés
 */
export const filterInventoryItems = (
	items: InventoryItemWithStatus[],
	filters: InventoryFilters
): InventoryItemWithStatus[] => {
	return items.filter((item) => {
		// Filtre par recherche
		if (filters.search?.query) {
			const query = filters.search.query.toLowerCase();
			const searchText = `${item.product.name} ${
				item.product.brand || ''
			}`.toLowerCase();
			if (!searchText.includes(query)) return false;
		}

		// Filtre par catégorie
		if (
			filters.categoryId &&
			item.product.category.id !== filters.categoryId
		) {
			return false;
		}

		// Filtre par lieu de stockage
		if (
			filters.storageLocation &&
			item.storageLocation !== filters.storageLocation
		) {
			return false;
		}

		// Filtre par statut d'expiration
		if (
			filters.expiryStatus &&
			!filters.expiryStatus.includes(item.expiryStatus)
		) {
			return false;
		}

		// Filtre par jours avant expiration
		if (filters.expiringWithinDays && item.daysUntilExpiry !== undefined) {
			if (item.daysUntilExpiry > filters.expiringWithinDays) return false;
		}

		return true;
	});
};

/**
 * Calcule les statistiques d'inventaire
 */
export const calculateInventoryStats = (
	items: InventoryItemWithStatus[]
): InventoryStats => {
	const totalItems = items.length;
	const totalValue = items.reduce(
		(sum, item) => sum + (item.purchasePrice || 0),
		0
	);
	const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

	// Répartition par statut d'expiration
	const expiryBreakdown = items.reduce(
		(acc, item) => {
			acc[item.expiryStatus.toLowerCase() as keyof typeof acc]++;
			return acc;
		},
		{ good: 0, warning: 0, critical: 0, expired: 0, unknown: 0 }
	);

	return {
		totalItems,
		totalValue,
		totalQuantity,
		averageItemValue: totalItems > 0 ? totalValue / totalItems : 0,
		expiryBreakdown,
		categoryBreakdown: [], // À implémenter selon les besoins
		storageBreakdown: {}, // À implémenter selon les besoins
		recentActivity: {
			itemsAddedThisWeek: 0,
			itemsConsumedThisWeek: 0,
		},
	};
};
