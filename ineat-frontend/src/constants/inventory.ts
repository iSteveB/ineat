import type { UnitType } from '@/schemas';

// ===== OPTIONS DES TYPES D'UNITÉS =====

export const UNIT_TYPE_OPTIONS = [
	{ value: 'UNIT' as const, label: 'Unité(s)' },
	{ value: 'KG' as const, label: 'Kilogramme(s)' },
	{ value: 'G' as const, label: 'Gramme(s)' },
	{ value: 'L' as const, label: 'Litre(s)' },
	{ value: 'ML' as const, label: 'Millilitre(s)' },
] as const;

export type UnitTypeOption = typeof UNIT_TYPE_OPTIONS[number];

// ===== OPTIONS DES LIEUX DE STOCKAGE =====

export const STORAGE_LOCATION_OPTIONS = [
	'Réfrigérateur',
	'Congélateur',
	'Placard',
	'Cave',
	'Garde-manger',
	'Fruitier',
	'Autre',
] as const;

export type StorageLocationOption = typeof STORAGE_LOCATION_OPTIONS[number];

// ===== OPTIONS DES SCORES NUTRITIONNELS =====

export const NUTRISCORE_OPTIONS = [
	{ value: 'A', label: 'A - Très bonne qualité nutritionnelle', color: 'bg-green-500' },
	{ value: 'B', label: 'B - Bonne qualité nutritionnelle', color: 'bg-lime-500' },
	{ value: 'C', label: 'C - Qualité nutritionnelle moyenne', color: 'bg-yellow-500' },
	{ value: 'D', label: 'D - Qualité nutritionnelle faible', color: 'bg-orange-500' },
	{ value: 'E', label: 'E - Très faible qualité nutritionnelle', color: 'bg-red-500' },
] as const;

export const ECOSCORE_OPTIONS = [
	{ value: 'A', label: 'A - Très faible impact environnemental', color: 'bg-green-500' },
	{ value: 'B', label: 'B - Faible impact environnemental', color: 'bg-lime-500' },
	{ value: 'C', label: 'C - Impact environnemental modéré', color: 'bg-yellow-500' },
	{ value: 'D', label: 'D - Impact environnemental élevé', color: 'bg-orange-500' },
	{ value: 'E', label: 'E - Très fort impact environnemental', color: 'bg-red-500' },
] as const;

export const NOVASCORE_OPTIONS = [
	{ value: '1', label: '1 - Aliments non transformés ou transformés minimalement', color: 'bg-green-500' },
	{ value: '2', label: '2 - Ingrédients culinaires transformés', color: 'bg-yellow-500' },
	{ value: '3', label: '3 - Aliments transformés', color: 'bg-orange-500' },
	{ value: '4', label: '4 - Produits alimentaires ultra-transformés', color: 'bg-red-500' },
] as const;

// ===== CATÉGORIES D'EXPIRATION =====

export const EXPIRY_STATUS_OPTIONS = [
	{ value: 'GOOD', label: 'Bon état', color: 'bg-green-500', textColor: 'text-green-700' },
	{ value: 'WARNING', label: 'À consommer bientôt', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
	{ value: 'CRITICAL', label: 'À consommer rapidement', color: 'bg-orange-500', textColor: 'text-orange-700' },
	{ value: 'EXPIRED', label: 'Expiré', color: 'bg-red-500', textColor: 'text-red-700' },
	{ value: 'UNKNOWN', label: 'Date inconnue', color: 'bg-gray-500', textColor: 'text-gray-700' },
] as const;

// ===== CONSTANTES NUMÉRIQUES =====

export const INVENTORY_LIMITS = {
	// Quantités
	MIN_QUANTITY: 0.01,
	MAX_QUANTITY: 9999999,
	QUANTITY_STEP: 0.01,

	// Prix
	MIN_PRICE: 0,
	MAX_PRICE: 999999,
	PRICE_STEP: 0.01,

	// Dates
	MAX_EXPIRY_DAYS_AHEAD: 3650, // 10 ans
	DEFAULT_EXPIRY_DAYS_AHEAD: 30,

	// Texte
	MAX_NAME_LENGTH: 100,
	MAX_BRAND_LENGTH: 50,
	MAX_BARCODE_LENGTH: 14,
	MAX_STORAGE_LOCATION_LENGTH: 50,
	MAX_NOTES_LENGTH: 500,
	MAX_INGREDIENTS_LENGTH: 2000,
	MAX_IMAGE_URL_LENGTH: 500,
} as const;

// ===== MESSAGES DE VALIDATION =====

export const VALIDATION_MESSAGES = {
	// Champs obligatoires
	REQUIRED_NAME: 'Le nom du produit est obligatoire',
	REQUIRED_CATEGORY: 'La catégorie est obligatoire',
	REQUIRED_QUANTITY: 'La quantité est obligatoire',
	REQUIRED_UNIT_TYPE: 'Le type d\'unité est obligatoire',
	REQUIRED_PURCHASE_DATE: 'La date d\'achat est obligatoire',

	// Formats
	INVALID_QUANTITY: 'La quantité doit être un nombre positif',
	INVALID_PRICE: 'Le prix doit être un nombre positif ou nul',
	INVALID_BARCODE: 'Le code-barres doit contenir entre 8 et 14 chiffres',
	INVALID_EMAIL: 'L\'adresse email n\'est pas valide',
	INVALID_URL: 'L\'URL de l\'image n\'est pas valide',

	// Longueurs
	TOO_LONG_NAME: `Le nom ne peut pas dépasser ${INVENTORY_LIMITS.MAX_NAME_LENGTH} caractères`,
	TOO_LONG_BRAND: `La marque ne peut pas dépasser ${INVENTORY_LIMITS.MAX_BRAND_LENGTH} caractères`,
	TOO_LONG_NOTES: `Les notes ne peuvent pas dépasser ${INVENTORY_LIMITS.MAX_NOTES_LENGTH} caractères`,
	TOO_LONG_INGREDIENTS: `La liste d'ingrédients ne peut pas dépasser ${INVENTORY_LIMITS.MAX_INGREDIENTS_LENGTH} caractères`,

	// Dates
	EXPIRY_BEFORE_PURCHASE: 'La date de péremption doit être postérieure à la date d\'achat',
	PURCHASE_IN_FUTURE: 'La date d\'achat ne peut pas être dans le futur',
	EXPIRY_TOO_FAR: 'La date de péremption ne peut pas être si éloignée',

	// Logique métier
	INVALID_CATEGORY: 'La catégorie sélectionnée n\'est pas valide',
	QUANTITY_TOO_SMALL: `La quantité doit être d'au moins ${INVENTORY_LIMITS.MIN_QUANTITY}`,
	QUANTITY_TOO_LARGE: `La quantité ne peut pas dépasser ${INVENTORY_LIMITS.MAX_QUANTITY}`,
	PRICE_TOO_LARGE: `Le prix ne peut pas dépasser ${INVENTORY_LIMITS.MAX_PRICE}€`,
} as const;

// ===== VALEURS PAR DÉFAUT =====

export const DEFAULT_VALUES = {
	QUANTITY: '1',
	UNIT_TYPE: 'UNIT' as UnitType,
	PURCHASE_DATE: () => new Date().toISOString().split('T')[0],
	STORAGE_LOCATION: '',
	NOTES: '',
	PRICE: '',
} as const;

// ===== FILTRES ET RECHERCHE =====

export const SEARCH_FILTERS = {
	CATEGORIES: 'categories',
	STORAGE_LOCATIONS: 'storage',
	EXPIRY_STATUS: 'expiry',
	PRICE_RANGE: 'price',
	DATE_RANGE: 'date',
} as const;

export const SORT_OPTIONS = [
	{ value: 'name_asc', label: 'Nom (A-Z)' },
	{ value: 'name_desc', label: 'Nom (Z-A)' },
	{ value: 'expiry_asc', label: 'Date d\'expiration (plus proche)' },
	{ value: 'expiry_desc', label: 'Date d\'expiration (plus éloignée)' },
	{ value: 'purchase_asc', label: 'Date d\'achat (plus ancienne)' },
	{ value: 'purchase_desc', label: 'Date d\'achat (plus récente)' },
	{ value: 'quantity_asc', label: 'Quantité (plus faible)' },
	{ value: 'quantity_desc', label: 'Quantité (plus élevée)' },
	{ value: 'price_asc', label: 'Prix (moins cher)' },
	{ value: 'price_desc', label: 'Prix (plus cher)' },
] as const;