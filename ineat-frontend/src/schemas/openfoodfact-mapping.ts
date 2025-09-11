/**
 * Types de mapping OpenFoodFacts vers Prisma
 * Phase 2.2 - Création des types de transformation
 */

import { NutriScore, EcoScore, NovaScore } from './base';

// ===== TYPES POUR LES NUTRIMENTS =====

/**
 * Structure des nutriments pour Prisma (stockage JSON optimisé)
 */
export interface NutrientMapping {
	// Macronutriments principaux (obligatoires si disponibles)
	carbohydrates: number; // Glucides pour 100g
	proteins: number; // Protéines pour 100g
	fats: number; // Lipides pour 100g
	salt: number; // Sel pour 100g

	// Énergie
	energy?: number; // kcal pour 100g
	energyKj?: number; // kJ pour 100g

	// Détail glucides (optionnels)
	sugars?: number; // Sucres pour 100g
	fiber?: number; // Fibres pour 100g

	// Détail lipides (optionnels)
	saturatedFats?: number; // Acides gras saturés pour 100g
	monounsaturatedFats?: number; // Acides gras mono-insaturés
	polyunsaturatedFats?: number; // Acides gras poly-insaturés
	transFats?: number; // Acides gras trans
	cholesterol?: number; // Cholestérol

	// Minéraux principaux (optionnels)
	sodium?: number; // Sodium pour 100g
	calcium?: number; // Calcium
	iron?: number; // Fer
	magnesium?: number; // Magnésium
	potassium?: number; // Potassium
	zinc?: number; // Zinc

	// Vitamines principales (optionnels)
	vitaminA?: number; // Vitamine A
	vitaminC?: number; // Vitamine C
	vitaminD?: number; // Vitamine D
	vitaminE?: number; // Vitamine E
	vitaminB1?: number; // Thiamine
	vitaminB2?: number; // Riboflavine
	vitaminB6?: number; // Vitamine B6
	vitaminB9?: number; // Folate
	vitaminB12?: number; // Vitamine B12

	// Métadonnées
	dataPer?: '100g' | 'serving'; // Base de calcul
	lastUpdated?: number; // Timestamp de dernière MAJ
	completeness?: number; // Score de complétude 0-1
}

/**
 * Informations qualité sur les données récupérées
 */
export interface DataQualityInfo {
	completeness: number; // Score 0-1 de complétude des données
	lastModified?: number; // Timestamp dernière modification OFF
	hasMinimalData: boolean; // A-t-on au moins nom + marque
	hasNutritionalData: boolean; // A-t-on des données nutritionnelles
	hasScores: boolean; // A-t-on au moins un score (nutri/eco/nova)
	hasImage: boolean; // A-t-on une image
	hasIngredients: boolean; // A-t-on la liste des ingrédients
	warningMessages: string[]; // Messages d'alerte sur la qualité
}

// ===== MAPPING PRINCIPAL =====

/**
 * Résultat complet du mapping OpenFoodFacts vers notre format
 */
export interface OpenFoodFactsMapping {
	// Scores
	nutriscore: NutriScore | undefined;
	ecoScore: EcoScore | undefined;
	novaScore: NovaScore | undefined;

	// Données nutritionnelles structurées
	nutrients: NutrientMapping | undefined;

	// Média
	imageUrl: string | undefined;

	// Contenu
	ingredients: string | undefined;

	// Informations qualité
	quality: DataQualityInfo;

	// Métadonnées du mapping
	mappedAt: Date;
	sourceLanguage: 'fr' | 'en' | 'auto';
}

// ===== TYPES POUR LES ENUM PRISMA =====

/**
 * Mapping des valeurs OpenFoodFacts vers les enums Prisma
 */
export type NutriScorePrismaMapping = {
	[key in 'A' | 'B' | 'C' | 'D' | 'E']: NutriScore;
};

export type EcoScorePrismaMapping = {
	[key in 'A' | 'B' | 'C' | 'D' | 'E']: EcoScore;
};

export type NovaScorePrismaMapping = {
	[key in 1 | 2 | 3 | 4]: NovaScore;
};

// Constantes de mapping
export const NUTRI_SCORE_MAPPING: NutriScorePrismaMapping = {
	A: 'A' as NutriScore,
	B: 'B' as NutriScore,
	C: 'C' as NutriScore,
	D: 'D' as NutriScore,
	E: 'E' as NutriScore,
} as const;

export const ECO_SCORE_MAPPING: EcoScorePrismaMapping = {
	A: 'A' as EcoScore,
	B: 'B' as EcoScore,
	C: 'C' as EcoScore,
	D: 'D' as EcoScore,
	E: 'E' as EcoScore,
} as const;

export const NOVA_SCORE_MAPPING: NovaScorePrismaMapping = {
	1: 'GROUP_1' as NovaScore,
	2: 'GROUP_2' as NovaScore,
	3: 'GROUP_3' as NovaScore,
	4: 'GROUP_4' as NovaScore,
} as const;

// ===== TYPES POUR LA VALIDATION =====

/**
 * Configuration pour le mapping
 */
export interface MappingOptions {
	preferredLanguage: 'fr' | 'en';
	requireMinimalNutrients: boolean; // Exiger données nutritionnelles minimales
	requireImage: boolean; // Exiger une image
	requireIngredients: boolean; // Exiger les ingrédients
	qualityThreshold: number; // Seuil de qualité minimum (0-1)
}

/**
 * Résultat de validation du mapping
 */
export interface MappingValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	quality: DataQualityInfo;
}

// ===== UTILITAIRES DE TYPE =====

/**
 * Type guard pour vérifier si on a des données nutritionnelles valides
 */
export const isValidNutrientMapping = (
	nutrients: unknown
): nutrients is NutrientMapping => {
	if (!nutrients || typeof nutrients !== 'object') return false;

	const n = nutrients as Record<string, unknown>;

	// Vérifier qu'on a au moins les 4 macronutriments de base
	const requiredFields = ['carbohydrates', 'proteins', 'fats', 'salt'];

	return requiredFields.every(
		(field) => typeof n[field] === 'number' && n[field] >= 0
	);
};

/**
 * Type guard pour vérifier la qualité des données
 */
export const hasGoodDataQuality = (
	quality: DataQualityInfo,
	threshold = 0.6
): boolean => {
	return (
		quality.completeness >= threshold &&
		quality.hasMinimalData &&
		quality.warningMessages.length === 0
	);
};

/**
 * Type pour les erreurs de mapping
 */
export interface MappingError extends Error {
	type:
		| 'VALIDATION_ERROR'
		| 'MISSING_DATA'
		| 'INVALID_FORMAT'
		| 'QUALITY_TOO_LOW';
	field?: string;
	received?: unknown;
	quality?: DataQualityInfo;
}

// ===== CONSTANTES DE QUALITÉ =====

/**
 * Seuils de qualité pour les différents niveaux
 */
export const QUALITY_THRESHOLDS = {
	EXCELLENT: 0.9, // Données très complètes
	GOOD: 0.7, // Données suffisantes pour la plupart des usages
	ACCEPTABLE: 0.5, // Données de base disponibles
	POOR: 0.3, // Données incomplètes
	MINIMAL: 0.1, // Quasiment pas de données
} as const;

/**
 * Messages d'erreur localisés pour le mapping
 */
export const MAPPING_ERROR_MESSAGES = {
	MISSING_NAME: 'Nom du produit manquant',
	MISSING_BRAND: 'Marque du produit manquante',
	INVALID_NUTRISCORE: 'Nutri-Score invalide',
	INVALID_ECOSCORE: 'Eco-Score invalide',
	INVALID_NOVASCORE: 'Nova-Score invalide',
	INSUFFICIENT_NUTRIENTS: 'Données nutritionnelles insuffisantes',
	NO_IMAGE: 'Aucune image disponible',
	NO_INGREDIENTS: 'Liste des ingrédients manquante',
	QUALITY_TOO_LOW: 'Qualité des données trop faible',
	NETWORK_ERROR: 'Erreur de récupération des données',
} as const;
