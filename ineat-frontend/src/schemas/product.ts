import { z } from 'zod';
import {
	UuidSchema,
	UnitTypeSchema,
	NutriScoreSchema,
	EcoscoreSchema,
	NovascoreSchema,
	ShortTextSchema,
	NutriScore,
	Ecoscore,
	Novascore,
	UnitType,
} from './base';
import {
	TimestampsSchema,
	ApiSuccessResponseSchema,
	PaginatedResponseSchema,
	SearchFilterSchema,
} from './common';

// ===== SCHÉMAS DE CATÉGORIES =====

export const CategorySchema = z.object({
	id: UuidSchema,
	name: ShortTextSchema,
	slug: z
		.string()
		.regex(
			/^[a-z0-9-]+$/,
			'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'
		),
	icon: z.string().optional(),
	parentId: UuidSchema.optional(),
});
export type Category = z.infer<typeof CategorySchema>;

// Catégorie avec ses enfants (pour l'arbre de catégories)
export const CategoryWithChildrenSchema: z.ZodType<
	Category & { children?: Category[] }
> = CategorySchema.extend({
	children: z.lazy(() => z.array(CategoryWithChildrenSchema)).optional(),
});
export type CategoryWithChildren = z.infer<typeof CategoryWithChildrenSchema>;

// ===== SCHÉMAS D'INFORMATIONS NUTRITIONNELLES =====

export const NutritionalInfoSchema = z.object({
	energy: z.coerce
		.number()
		.min(0, "L'énergie ne peut pas être négative")
		.optional(), // kcal pour 100g
	proteins: z.coerce
		.number()
		.min(0, 'Les protéines ne peuvent pas être négatives')
		.optional(), // g pour 100g
	carbohydrates: z.coerce
		.number()
		.min(0, 'Les glucides ne peuvent pas être négatifs')
		.optional(), // g pour 100g
	sugars: z.coerce
		.number()
		.min(0, 'Les sucres ne peuvent pas être négatifs')
		.optional(), // g pour 100g
	fats: z.coerce
		.number()
		.min(0, 'Les lipides ne peuvent pas être négatifs')
		.optional(), // g pour 100g
	saturatedFats: z.coerce
		.number()
		.min(0, 'Les graisses saturées ne peuvent pas être négatives')
		.optional(), // g pour 100g
	salt: z.coerce
		.number()
		.min(0, 'Le sel ne peut pas être négatif')
		.optional(), // g pour 100g
	sodium: z.coerce
		.number()
		.min(0, 'Le sodium ne peut pas être négatif')
		.optional(), // g pour 100g
	fiber: z.coerce
		.number()
		.min(0, 'Les fibres ne peuvent pas être négatives')
		.optional(), // g pour 100g
});
export type NutritionalInfo = z.infer<typeof NutritionalInfoSchema>;

// ===== SCHÉMA PRODUIT PRINCIPAL =====

export const ProductSchema = z
	.object({
		id: UuidSchema,
		name: ShortTextSchema,
		brand: ShortTextSchema.optional(),
		barcode: z
			.string()
			.regex(
				/^[0-9]{8,13}$/,
				'Le code-barres doit contenir entre 8 et 13 chiffres'
			)
			.optional(),
		category: CategorySchema,
		unitType: UnitTypeSchema,
		nutriscore: NutriScoreSchema.optional(),
		ecoscore: EcoscoreSchema.optional(),
		novascore: NovascoreSchema.optional(),
		imageUrl: z.string().url("URL d'image invalide").optional(),
		externalId: z.string().optional(), // ID OpenFoodFacts
		ingredients: z.string().optional(),
		nutrients: NutritionalInfoSchema.optional(),
	})
	.merge(TimestampsSchema);

export type Product = z.infer<typeof ProductSchema>;

// Version simplifiée du produit (pour les listes)
export const ProductSummarySchema = ProductSchema.pick({
	id: true,
	name: true,
	brand: true,
	imageUrl: true,
	nutriscore: true,
	unitType: true,
}).extend({
	categoryName: z.string(),
});
export type ProductSummary = z.infer<typeof ProductSummarySchema>;

// ===== SCHÉMAS DE CRÉATION DE PRODUIT =====

// Création manuelle d'un produit (dans l'inventaire)
export const CreateProductSchema = z.object({
	name: ShortTextSchema,
	brand: ShortTextSchema.optional(),
	barcode: z
		.string()
		.regex(
			/^[0-9]{8,13}$/,
			'Le code-barres doit contenir entre 8 et 13 chiffres'
		)
		.optional(),
	category: z.string().min(1, 'La catégorie est obligatoire'), // Slug de la catégorie
	unitType: UnitTypeSchema,
	nutriscore: NutriScoreSchema.optional(),
	ecoscore: EcoscoreSchema.optional(),
	novascore: NovascoreSchema.optional(),
	imageUrl: z.string().url("URL d'image invalide").optional(),
	nutrients: NutritionalInfoSchema.optional(),
	ingredients: z.string().optional(),
});
export type CreateProductData = z.infer<typeof CreateProductSchema>;

// Mise à jour d'un produit
export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductData = z.infer<typeof UpdateProductSchema>;

// ===== SCHÉMAS DE RECHERCHE ET FILTRAGE =====

// Filtres de recherche de produits
export const ProductFiltersSchema = z.object({
	search: SearchFilterSchema.optional(),
	categoryId: UuidSchema.optional(),
	brand: z.string().optional(),
	nutriscore: z.array(NutriScoreSchema).optional(),
	ecoscore: z.array(EcoscoreSchema).optional(),
	hasImage: z.boolean().optional(),
	unitType: z.array(UnitTypeSchema).optional(),
});
export type ProductFilters = z.infer<typeof ProductFiltersSchema>;

// Paramètres de recherche dans OpenFoodFacts
export const OpenFoodFactsSearchSchema = z.object({
	query: z.string().min(1, 'Le terme de recherche ne peut pas être vide'),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type OpenFoodFactsSearchParams = z.infer<
	typeof OpenFoodFactsSearchSchema
>;

// ===== SCHÉMAS DE RÉPONSES API =====

// Réponse de création de produit
export const ProductCreatedResponseSchema =
	ApiSuccessResponseSchema(ProductSchema);
export type ProductCreatedResponse = z.infer<
	typeof ProductCreatedResponseSchema
>;

// Réponse de liste de produits
export const ProductListResponseSchema = ApiSuccessResponseSchema(
	PaginatedResponseSchema(ProductSummarySchema)
);
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;

// Réponse de détail d'un produit
export const ProductDetailResponseSchema =
	ApiSuccessResponseSchema(ProductSchema);
export type ProductDetailResponse = z.infer<typeof ProductDetailResponseSchema>;

// Réponse de liste de catégories
export const CategoryListResponseSchema = ApiSuccessResponseSchema(
	z.array(CategoryWithChildrenSchema)
);
export type CategoryListResponse = z.infer<typeof CategoryListResponseSchema>;

// ===== SCHÉMAS OPENFOODFACTS =====

// Produit provenant d'OpenFoodFacts
export const OpenFoodFactsProductSchema = z.object({
	code: z.string(), // Barcode
	product_name: z.string().optional(),
	brands: z.string().optional(),
	image_url: z.string().optional(),
	nutriscore_grade: z.string().optional(),
	ecoscore_grade: z.string().optional(),
	nova_group: z.string().optional(),
	categories: z.string().optional(),
	nutriments: z
		.object({
			energy_kcal_100g: z.number().optional(),
			proteins_100g: z.number().optional(),
			carbohydrates_100g: z.number().optional(),
			sugars_100g: z.number().optional(),
			fat_100g: z.number().optional(),
			'saturated-fat_100g': z.number().optional(),
			salt_100g: z.number().optional(),
			fiber_100g: z.number().optional(),
		})
		.optional(),
});
export type OpenFoodFactsProduct = z.infer<typeof OpenFoodFactsProductSchema>;

// Réponse de recherche OpenFoodFacts
export const OpenFoodFactsSearchResponseSchema = z.object({
	products: z.array(OpenFoodFactsProductSchema),
	count: z.number(),
	page: z.number(),
	page_size: z.number(),
	page_count: z.number(),
});
export type OpenFoodFactsSearchResponse = z.infer<
	typeof OpenFoodFactsSearchResponseSchema
>;

// ===== UTILITAIRES =====

/**
 * Convertit un produit OpenFoodFacts en produit InEat
 */
export const mapOpenFoodFactsProduct = (
	ofProduct: OpenFoodFactsProduct,
	categoryId: string
): CreateProductData => {
	// Normaliser le nutriscore
	const nutriscore = ofProduct.nutriscore_grade?.toUpperCase();
	const validNutriscore = ['A', 'B', 'C', 'D', 'E'].includes(nutriscore || '')
		? (nutriscore as NutriScore)
		: undefined;

	// Normaliser l'ecoscore
	const ecoscore = ofProduct.ecoscore_grade?.toUpperCase();
	const validEcoscore = ['A', 'B', 'C', 'D', 'E'].includes(ecoscore || '')
		? (ecoscore as Ecoscore)
		: undefined;

	// Normaliser le nova score
	const novascore = ofProduct.nova_group
		? ['1', '2', '3', '4'].includes(ofProduct.nova_group)
			? (['A', 'B', 'C', 'D'][
					parseInt(ofProduct.nova_group) - 1
			  ] as Novascore)
			: undefined
		: undefined;

	return {
		name: ofProduct.product_name || 'Produit sans nom',
		brand: ofProduct.brands?.split(',')[0]?.trim(),
		category: categoryId,
		unitType: 'UNIT', // Par défaut, peut être modifié par l'utilisateur
		nutriscore: validNutriscore,
		ecoscore: validEcoscore,
		novascore: novascore,
		imageUrl: ofProduct.image_url,
		nutrients: ofProduct.nutriments
			? {
					energy: ofProduct.nutriments.energy_kcal_100g,
					proteins: ofProduct.nutriments.proteins_100g,
					carbohydrates: ofProduct.nutriments.carbohydrates_100g,
					sugars: ofProduct.nutriments.sugars_100g,
					fats: ofProduct.nutriments.fat_100g,
					saturatedFats: ofProduct.nutriments['saturated-fat_100g'],
					salt: ofProduct.nutriments.salt_100g,
					fiber: ofProduct.nutriments.fiber_100g,
			  }
			: undefined,
	};
};

/**
 * Détermine l'unité de mesure la plus appropriée pour un produit
 */
export const suggestUnitType = (
	productName: string,
	categories?: string
): UnitType => {
	const name = productName.toLowerCase();
	const cats = categories?.toLowerCase() || '';

	// Liquides
	if (
		name.includes('lait') ||
		name.includes('jus') ||
		name.includes('eau') ||
		name.includes('boisson') ||
		cats.includes('beverage') ||
		cats.includes('boisson')
	) {
		return 'L';
	}

	// Produits pesés
	if (
		name.includes('viande') ||
		name.includes('poisson') ||
		name.includes('fromage') ||
		name.includes('légume') ||
		name.includes('fruit') ||
		cats.includes('meat') ||
		cats.includes('cheese') ||
		cats.includes('vegetables')
	) {
		return 'KG';
	}

	// Par défaut, unité
	return 'UNIT';
};

/**
 * Valide un code-barres
 */
export const validateBarcode = (barcode: string): boolean => {
	return /^[0-9]{8,13}$/.test(barcode);
};

/**
 * Génère un slug à partir d'un nom de catégorie
 */
export const generateCategorySlug = (name: string): string => {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Supprime les accents
		.replace(/[^a-z0-9\s-]/g, '') // Garde seulement lettres, chiffres, espaces et tirets
		.replace(/\s+/g, '-') // Remplace les espaces par des tirets
		.replace(/-+/g, '-') // Remplace les tirets multiples par un seul
		.replace(/^-|-$/g, ''); // Supprime les tirets en début et fin
};
