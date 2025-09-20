/**
 * Types TypeScript pour l'API OpenFoodFacts
 * Documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

// URLs des différents environnements OFF
export const OFF_URLS = {
	PRODUCTION: 'https://world.openfoodfacts.org',
	STAGING: 'https://world.openfoodfacts.net',
	IMAGES_BASE: 'https://images.openfoodfacts.org/images/products',
} as const;

// Configuration par défaut pour l'API
export const OFF_API_CONFIG = {
	DEFAULT_TIMEOUT: 10000, // 10 secondes
	DEFAULT_USER_AGENT: 'MonInventaire/1.0 (contact@monapp.com)',
	DEFAULT_LANGUAGE: 'fr',
	TEST_USER_AGENT: 'MonInventaire-Test/1.0 (contact@monapp.com)',
	TEST_TIMEOUT: 5000, // 5 secondes pour les tests
} as const;

export const OFF_DEFAULT_FIELDS = [
	// Noms et identifiants
	'product_name',
	'product_name_fr',
	'product_name_en',
	'generic_name',
	'code',

	// Marques et entreprises
	'brands',
	'brand_owner',

	// Catégories
	'categories_tags_en',
	'categories_tags_fr',

	// Quantité et conditionnement
	'quantity',
	'product_quantity',
	'product_quantity_unit',

	// Ingredients
	'ingredients_text',
	'ingredients_text_fr', // Ingrédients en français
	'ingredients_text_en', // Ingrédients en anglais
	'ingredients_text_with_allergens',
	'ingredients_text_with_allergens_fr',

	// Allergènes
	'allergens', // Allergènes
	'allergens_tags',
	'traces', // Traces d'allergènes
	'traces_tags',

	// Scores et notes
	'nutrition_grades',
	'nutriscore_grade',
	'nutriscore_data', // Données détaillées Nutriscore
	'nutrition_data_per', // Données nutritionnelles par 100g
	'ecoscore_grade',
	'ecoscore_score', // Score numérique Ecoscore
	'nova_group',

	// Images
	'selected_images',
	'image_front_url',
	'image_front_small_url', // Image petite taille
	'image_front_thumb_url', // Vignette

	// Métadonnées utiles
	'last_modified_t',
	'completeness',
] as const;

// Champs minimaux pour un scan rapide
export const OFF_MINIMAL_FIELDS = [
	'product_name',
	'product_name_fr',
	'product_name_en',
	'brands',
	'categories_tags_en',
	'nutrition_grades',
	'selected_images',
] as const;

// Messages d'erreur localisés
export const OFF_ERROR_MESSAGES = {
	NETWORK_ERROR:
		'Impossible de contacter OpenFoodFacts. Vérifiez votre connexion internet.',
	API_ERROR: 'Erreur du serveur OpenFoodFacts. Veuillez réessayer plus tard.',
	PRODUCT_NOT_FOUND:
		'Produit non trouvé dans la base de données OpenFoodFacts.',
	INVALID_BARCODE: 'Code-barre invalide. Veuillez vérifier le format.',
	RATE_LIMIT: 'Trop de requêtes. Veuillez patienter quelques instants.',
	TIMEOUT: "Délai d'attente dépassé. Vérifiez votre connexion.",
	UNKNOWN_ERROR: "Une erreur inattendue s'est produite.",
} as const;

// Regex pour validation des codes-barres
export const BARCODE_REGEX = /^\d{8,13}$/;

// Tailles d'images disponibles sur OFF
export const OFF_IMAGE_SIZES = {
	THUMB: '100',
	SMALL: '200',
	MEDIUM: '400',
	FULL: 'full',
} as const;

// Nutri-Score grades possibles
export const NUTRI_SCORE_GRADES = ['a', 'b', 'c', 'd', 'e'] as const;
export type NutriScoreGrade = (typeof NUTRI_SCORE_GRADES)[number];

// NOVA groups possibles
export const NOVA_GROUPS = [1, 2, 3, 4] as const;
export type NovaGroup = (typeof NOVA_GROUPS)[number];

// Configuration pour différents environnements
export const OFF_ENVIRONMENTS = {
	production: {
		baseUrl: OFF_URLS.PRODUCTION,
		userAgent: OFF_API_CONFIG.DEFAULT_USER_AGENT,
		timeout: OFF_API_CONFIG.DEFAULT_TIMEOUT,
		fields: OFF_DEFAULT_FIELDS,
	},
	staging: {
		baseUrl: OFF_URLS.STAGING,
		userAgent: OFF_API_CONFIG.TEST_USER_AGENT,
		timeout: OFF_API_CONFIG.TEST_TIMEOUT,
		fields: OFF_MINIMAL_FIELDS,
		auth: {
			username: 'off',
			password: 'off',
		},
	},
} as const;

// Structure des images dans OFF
export interface OffImageSizes {
	'100'?: { w: number; h: number };
	'200'?: { w: number; h: number };
	'400'?: { w: number; h: number };
	full?: { w: number; h: number };
}

export interface OffRawImage {
	sizes: OffImageSizes;
	uploader: string;
	uploaded_t: string;
}

export interface OffSelectedImage {
	x1: number | null;
	y1: number | null;
	x2: number | null;
	y2: number | null;
	angle: number | null;
	imgid: string;
	rev: string;
	sizes: OffImageSizes;
	white_magic: string;
	normalize: string;
	geometry: string;
}

export interface OffImageUrls {
	small?: { [lang: string]: string };
	display?: { [lang: string]: string };
	thumb?: { [lang: string]: string };
}

export interface OffSelectedImages {
	front?: OffImageUrls;
	ingredients?: OffImageUrls;
	nutrition?: OffImageUrls;
	packaging?: OffImageUrls;
}

export interface OffImages {
	[key: string]: OffRawImage | OffSelectedImage;
}

// Informations nutritionnelles
export interface OffNutriments {
	energy?: number;
	'energy-kcal'?: number;
	'energy-kcal_100g'?: number;
	'energy-kcal_unit'?: string;
	'energy-kcal_value'?: number;
	carbohydrates?: number;
	carbohydrates_100g?: number;
	carbohydrates_unit?: string;
	carbohydrates_value?: number;
	sugars?: number;
	sugars_100g?: number;
	sugars_unit?: string;
	sugars_value?: number;
	proteins?: number;
	proteins_100g?: number;
	proteins_unit?: string;
	proteins_value?: number;
	fat?: number;
	fat_100g?: number;
	fat_unit?: string;
	fat_value?: number;
	salt?: number;
	salt_100g?: number;
	salt_unit?: string;
	salt_value?: number;
	sodium?: number;
	sodium_100g?: number;
	sodium_unit?: string;
	sodium_value?: number;
}

// Données Nutri-Score
export interface OffNutriscoreData {
	energy: number;
	energy_points: number;
	energy_value: number;
	fiber: number;
	fiber_points: number;
	fiber_value: number;
	fruits_vegetables_nuts_colza_walnut_olive_oils: number;
	fruits_vegetables_nuts_colza_walnut_olive_oils_points: number;
	fruits_vegetables_nuts_colza_walnut_olive_oils_value: number;
	proteins: number;
	proteins_points: number;
	proteins_value: number;
	saturated_fat: number;
	saturated_fat_points: number;
	saturated_fat_value: number;
	sodium: number;
	sodium_points: number;
	sodium_value: number;
	sugars: number;
	sugars_points: number;
	sugars_value: number;
	grade: string;
	negative_points: number;
	positive_points: number;
	score: number;
}

// Produit OFF complet
export interface OffProduct {
	// Identifiants
	code?: string;
	id?: string;
	lc?: string;
	lang?: string;

	// Noms et descriptions
	product_name?: string;
	product_name_en?: string;
	product_name_fr?: string;
	generic_name?: string;
	generic_name_en?: string;
	generic_name_fr?: string;
	abbreviated_product_name?: string;

	// Marques et entreprises
	brands?: string;
	brands_tags?: string[];
	brand_owner?: string;

	// Catégories
	categories?: string;
	categories_tags?: string[];
	categories_tags_en?: string[];
	categories_tags_fr?: string[];
	categories_hierarchy?: string[];

	// Quantité et conditionnement
	quantity?: string;
	product_quantity?: string;
	product_quantity_unit?: string;

	// Ingrédients
	ingredients_text?: string;
	ingredients_text_en?: string;
	ingredients_text_fr?: string;
	ingredients_text_with_allergens?: string;
	ingredients_text_with_allergens_en?: string;
	ingredients_text_with_allergens_fr?: string;
	ingredients_tags?: string[];

	// Scores et notes
	nutrition_grades?: string; // a, b, c, d, e
	nutrition_grades_tags?: string[];
	nutriscore_grade?: string;
	ecoscore_grade?: string;
	ecoscore_score?: number;
	nova_group?: number; // 1, 2, 3, 4
	nova_groups?: string;

	// Données nutritionnelles
	nutriments?: OffNutriments;
	nutriscore_data?: OffNutriscoreData;
	nutrition_data_per?: string; // "100g" | "serving"
	nutrition_data_prepared_per?: string;

	// Images
	images?: OffImages;
	selected_images?: OffSelectedImages;
	image_front_url?: string;
	image_ingredients_url?: string;
	image_nutrition_url?: string;
	image_packaging_url?: string;

	// Étiquettes et labels
	labels?: string;
	labels_tags?: string[];
	labels_tags_en?: string[];
	labels_tags_fr?: string[];

	// Magasins et lieux
	stores?: string;
	stores_tags?: string[];
	countries?: string;
	countries_tags?: string[];

	// Métadonnées
	created_t?: number;
	last_modified_t?: number;
	last_modified_by?: string;
	creator?: string;
	editors_tags?: string[];

	// État du produit
	obsolete?: string;
	obsolete_since_date?: string;
	complete?: number;
	completeness?: number;

	// Additifs
	additives_n?: number;
	additives_tags?: string[];

	// Allergènes
	allergens?: string;
	allergens_tags?: string[];

	// Traces
	traces?: string;
	traces_tags?: string[];

	// Codes spéciaux
	codes_tags?: string[];
	emb_codes?: string;
	emb_codes_tags?: string[];

	// Divers
	misc_tags?: string[];
	packaging?: string;
	packaging_tags?: string[];
	checked?: string;
}

// Réponse de l'API OFF pour un produit
export interface OffProductResponse {
	code: string;
	status: number; // 1 = found, 0 = not found
	status_verbose: string; // "product found" | "product not found"
	product?: OffProduct;
}

// Réponse de recherche OFF
export interface OffSearchResponse {
	count: number;
	page: number;
	page_count: number;
	page_size: number;
	skip: number;
	products: OffProduct[];
}

// Configuration pour les requêtes OFF
export interface OffApiConfig {
	baseUrl: string;
	userAgent: string;
	timeout: number;
}

// Erreurs spécifiques OFF
export interface OffError {
	type:
		| 'NETWORK_ERROR'
		| 'API_ERROR'
		| 'PRODUCT_NOT_FOUND'
		| 'INVALID_BARCODE'
		| 'RATE_LIMIT'
		| 'UNKNOWN_ERROR';
	message: string;
	details?: unknown;
}

// Paramètres pour la requête d'un produit
export interface OffProductParams {
	barcode: string;
	fields?: string[];
	lc?: string; // language code (fr, en, etc.)
}

// Paramètres pour la recherche
export interface OffSearchParams {
	query?: string;
	categories_tags_en?: string[];
	brands_tags?: string[];
	nutrition_grades_tags?: string[];
	labels_tags_en?: string[];
	fields?: string[];
	sort_by?: string;
	page?: number;
	page_size?: number;
}

// Types utilitaires dérivés des constantes
export type OffEnvironment = keyof typeof OFF_ENVIRONMENTS;
export type OffImageSize =
	(typeof OFF_IMAGE_SIZES)[keyof typeof OFF_IMAGE_SIZES];

/**
 * Utilitaires pour travailler avec OpenFoodFacts
 */
export const OFF_UTILS = {
	/**
	 * Vérifie si un code-barre est valide
	 */
	isValidBarcode: (barcode: string): boolean => {
		return BARCODE_REGEX.test(barcode.trim());
	},

	/**
	 * Normalise un code-barre (trim + validation)
	 */
	normalizeBarcode: (barcode: string): string | null => {
		const normalized = barcode.trim();
		return OFF_UTILS.isValidBarcode(normalized) ? normalized : null;
	},

	/**
	 * Récupère la configuration pour un environnement
	 */
	getEnvironmentConfig: (env: OffEnvironment) => {
		return OFF_ENVIRONMENTS[env];
	},

	/**
	 * Vérifie si un Nutri-Score est valide
	 */
	isValidNutriScore: (grade: string): grade is NutriScoreGrade => {
		return NUTRI_SCORE_GRADES.includes(grade as NutriScoreGrade);
	},

	/**
	 * Vérifie si un groupe NOVA est valide
	 */
	isValidNovaGroup: (group: number): group is NovaGroup => {
		return NOVA_GROUPS.includes(group as NovaGroup);
	},

	/**
	 * Formate un message d'erreur localisé
	 */
	getErrorMessage: (errorType: keyof typeof OFF_ERROR_MESSAGES): string => {
		return OFF_ERROR_MESSAGES[errorType];
	},

	/**
	 * Construit le User-Agent avec les informations de l'app
	 */
	buildUserAgent: (
		appName: string,
		version: string,
		contactEmail: string
	): string => {
		return `${appName}/${version} (${contactEmail})`;
	},
} as const;
