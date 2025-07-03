import { z } from 'zod';

// Enums correspondant au backend
export const UnitTypeSchema = z.enum(['KG', 'G', 'L', 'ML', 'UNIT']);
export const NutriScoreSchema = z.enum(['A', 'B', 'C', 'D', 'E']);
export const EcoScoreSchema = z.enum(['A', 'B', 'C', 'D', 'E']);

export type UnitType = z.infer<typeof UnitTypeSchema>;
export type NutriScore = z.infer<typeof NutriScoreSchema>;
export type EcoScore = z.infer<typeof EcoScoreSchema>;

// Schéma pour les informations nutritionnelles
export const NutritionalInfoSchema = z.object({
	carbohydrates: z.coerce
		.number()
		.min(0, 'Les glucides ne peuvent pas être négatifs')
		.optional(),
	proteins: z.coerce
		.number()
		.min(0, 'Les protéines ne peuvent pas être négatives')
		.optional(),
	fats: z.coerce
		.number()
		.min(0, 'Les lipides ne peuvent pas être négatifs')
		.optional(),
	salt: z.coerce
		.number()
		.min(0, 'Le sel ne peut pas être négatif')
		.optional(),
});

export type NutritionalInfo = z.infer<typeof NutritionalInfoSchema>;

// Schéma principal pour l'ajout de produit manuel - CORRIGÉ POUR LE BACKEND
export const AddManualProductSchema = z
	.object({
		name: z
			.string()
			.min(1, 'Le nom du produit est obligatoire')
			.max(100, 'Le nom ne peut pas dépasser 100 caractères')
			.transform((val) => val.trim()),

		brand: z
			.string()
			.max(50, 'La marque ne peut pas dépasser 50 caractères')
			.transform((val) => val.trim() || undefined)
			.optional(),

		// CHANGEMENT CRITIQUE: utiliser 'category' au lieu de 'categoryId' pour correspondre au backend
		category: z.string().min(1, 'La catégorie est obligatoire'),

		barcode: z
			.string()
			.max(50, 'Le code-barres ne peut pas dépasser 50 caractères')
			.transform((val) => val.trim() || undefined)
			.optional(),

		quantity: z.coerce
			.number()
			.min(0.01, 'La quantité doit être supérieure à 0')
			.max(10000, 'La quantité semble trop importante'),

		unitType: UnitTypeSchema,

		purchaseDate: z
			.string()
			.regex(
				/^\d{4}-\d{2}-\d{2}$/,
				'Format de date invalide (YYYY-MM-DD)'
			)
			.refine((date) => {
				const parsed = new Date(date);
				const now = new Date();
				now.setHours(23, 59, 59, 999); // Fin de journée
				return parsed <= now;
			}, "La date d'achat ne peut pas être dans le futur"),

		expiryDate: z
			.string()
			.regex(
				/^\d{4}-\d{2}-\d{2}$/,
				'Format de date invalide (YYYY-MM-DD)'
			)
			.optional()
			.or(z.literal('')),

		purchasePrice: z.coerce
			.number()
			.min(0, 'Le prix ne peut pas être négatif')
			.max(1000, 'Le prix semble trop élevé')
			.optional(),

		storageLocation: z
			.string()
			.max(50, 'Le lieu de stockage ne peut pas dépasser 50 caractères')
			.optional(),

		notes: z
			.string()
			.max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
			.transform((val) => val.trim() || undefined)
			.optional(),

		nutriscore: NutriScoreSchema.optional(),
		ecoscore: EcoScoreSchema.optional(),

		nutritionalInfo: NutritionalInfoSchema.optional(),
	})
	.refine(
		(data) => {
			// Validation croisée : date de péremption doit être après la date d'achat
			if (data.expiryDate && data.expiryDate !== '') {
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

export type AddManualProductInput = z.infer<typeof AddManualProductSchema>;

// Schéma pour l'interface frontend (ce que le formulaire utilise)
export const AddManualProductFormSchema = z
	.object({
		name: z
			.string()
			.min(1, 'Le nom du produit est obligatoire')
			.max(100, 'Le nom ne peut pas dépasser 100 caractères')
			.transform((val) => val.trim()),

		brand: z
			.string()
			.max(50, 'La marque ne peut pas dépasser 50 caractères')
			.transform((val) => val.trim() || undefined)
			.optional(),

		// Le formulaire utilise 'categoryId' pour l'interface utilisateur
		categoryId: z.string().min(1, 'La catégorie est obligatoire'),

		barcode: z
			.string()
			.max(50, 'Le code-barres ne peut pas dépasser 50 caractères')
			.transform((val) => val.trim() || undefined)
			.optional(),

		quantity: z.coerce
			.number()
			.min(0.01, 'La quantité doit être supérieure à 0')
			.max(10000, 'La quantité semble trop importante'),

		unitType: UnitTypeSchema,

		purchaseDate: z
			.string()
			.regex(
				/^\d{4}-\d{2}-\d{2}$/,
				'Format de date invalide (YYYY-MM-DD)'
			)
			.refine((date) => {
				const parsed = new Date(date);
				const now = new Date();
				now.setHours(23, 59, 59, 999); // Fin de journée
				return parsed <= now;
			}, "La date d'achat ne peut pas être dans le futur"),

		expiryDate: z
			.string()
			.regex(
				/^\d{4}-\d{2}-\d{2}$/,
				'Format de date invalide (YYYY-MM-DD)'
			)
			.optional()
			.or(z.literal('')),

		purchasePrice: z.coerce
			.number()
			.min(0, 'Le prix ne peut pas être négatif')
			.max(1000, 'Le prix semble trop élevé')
			.optional(),

		storageLocation: z
			.string()
			.max(50, 'Le lieu de stockage ne peut pas dépasser 50 caractères')
			.optional(),

		notes: z
			.string()
			.max(500, 'Les notes ne peuvent pas dépasser 500 caractères')
			.transform((val) => val.trim() || undefined)
			.optional(),
	})
	.refine(
		(data) => {
			// Validation croisée : date de péremption doit être après la date d'achat
			if (data.expiryDate && data.expiryDate !== '') {
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

export type AddManualProductFormInput = z.infer<
	typeof AddManualProductFormSchema
>;

// Type pour les données comme elles arrivent réellement du formulaire
export type AddManualProductFormInputActual = {
	name: string;
	brand?: string;
	barcode?: string;
	category: string; // Le formulaire envoie 'category' avec l'ID
	quantity: number;
	unitType: 'KG' | 'G' | 'L' | 'ML' | 'UNIT';
	purchaseDate: string;
	expiryDate?: string;
	purchasePrice?: number;
	storageLocation?: string;
	notes?: string;
};

// Fonction utilitaire pour mapper les données du formulaire vers l'API
// Note: Le backend attend le slug de la catégorie, pas son ID
export const mapFormToApiData = (
	formData: AddManualProductFormInput | AddManualProductFormInputActual,
	categories: { id: string; slug: string }[]
): AddManualProductInput => {
	// Debug : afficher les données reçues
	console.log('=== DEBUG mapFormToApiData ===');
	console.log('formData reçu:', formData);
	console.log('categories reçues:', categories);

	// Déterminer si on a categoryId ou category
	let categoryIdToUse: string;
	let restOfData: Omit<
		AddManualProductFormInput | AddManualProductFormInputActual,
		'categoryId' | 'category'
	>;

	if ('categoryId' in formData && formData.categoryId) {
		// Cas normal : le formulaire envoie categoryId
		const { categoryId, ...rest } = formData as AddManualProductFormInput;
		categoryIdToUse = categoryId;
		restOfData = rest;
		console.log('✅ Format attendu: categoryId trouvé:', categoryIdToUse);
	} else if ('category' in formData && formData.category) {
		// Cas actuel : le formulaire envoie category avec l'ID
		const { category, ...rest } =
			formData as AddManualProductFormInputActual;
		categoryIdToUse = category;
		restOfData = rest;
		console.log(
			'🔧 Format alternatif: category trouvé (utilisé comme categoryId):',
			categoryIdToUse
		);
	} else {
		console.error(
			'❌ Ni categoryId ni category trouvé dans formData:',
			formData
		);
		throw new Error(
			"L'ID de catégorie est requis mais manquant dans les données du formulaire"
		);
	}

	console.log('ID de catégorie à utiliser:', categoryIdToUse);

	// Trouver le slug correspondant à l'ID de catégorie
	const selectedCategory = categories.find(
		(cat) => cat.id === categoryIdToUse
	);

	console.log('Catégorie trouvée:', selectedCategory);

	if (!selectedCategory) {
		console.error('❌ Catégorie non trouvée');
		console.error('categoryId recherché:', categoryIdToUse);
		console.error(
			'Catégories disponibles:',
			categories.map((cat) => ({ id: cat.id, slug: cat.slug }))
		);
		throw new Error(
			`Catégorie avec l'ID ${categoryIdToUse} non trouvée dans la liste des catégories disponibles`
		);
	}

	const result: AddManualProductInput = {
		...restOfData,
		category: selectedCategory.slug, // Mapping de l'ID vers le slug de la catégorie
	};

	console.log("✅ Données mappées pour l'API:", result);
	console.log('=== FIN DEBUG mapFormToApiData ===');

	return result;
};

// Schéma pour la réponse du serveur après création
export const ProductCreatedResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	brand: z.string().optional(),
	category: z.string(),
	quantity: z.number(),
	unitType: UnitTypeSchema,
	purchaseDate: z.string(),
	expiryDate: z.string().optional(),
	purchasePrice: z.number().optional(),
	storageLocation: z.string().optional(),
	notes: z.string().optional(),
	nutriscore: NutriScoreSchema.optional(),
	ecoscore: EcoScoreSchema.optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type ProductCreatedResponse = z.infer<
	typeof ProductCreatedResponseSchema
>;

// Schéma pour un élément d'inventaire complet (avec produit)
export const InventoryItemSchema = z.object({
	id: z.string().uuid(),
	quantity: z.number(),
	expiryDate: z.string().datetime().optional(),
	purchaseDate: z.string().datetime(),
	purchasePrice: z.number().optional(),
	storageLocation: z.string().optional(),
	notes: z.string().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	product: z.object({
		id: z.string().uuid(),
		name: z.string(),
		brand: z.string().optional(),
		nutriscore: NutriScoreSchema.optional(),
		ecoScore: EcoScoreSchema.optional(),
		unitType: UnitTypeSchema,
		imageUrl: z.string().optional(),
		category: z.object({
			id: z.string().uuid(),
			name: z.string(),
			slug: z.string(),
			icon: z.string().optional(),
		}),
	}),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

// Schéma pour les filtres d'inventaire
export const InventoryFiltersSchema = z.object({
	category: z.string().optional(),
	storageLocation: z.string().optional(),
	expiringWithinDays: z.coerce.number().int().min(1).max(365).optional(),
});

export type InventoryFilters = z.infer<typeof InventoryFiltersSchema>;

// Schéma pour les statistiques d'inventaire
export const InventoryStatsSchema = z.object({
	totalItems: z.number(),
	totalValue: z.number(),
	expiringInWeek: z.number(),
	categoriesBreakdown: z.array(
		z.object({
			categoryName: z.string(),
			count: z.number(),
			percentage: z.number(),
		})
	),
	storageBreakdown: z.record(z.string(), z.number()),
});

export type InventoryStats = z.infer<typeof InventoryStatsSchema>;
