import { z } from 'zod';

/**
 * Schémas et types pour le scan de tickets de caisse
 *
 * Workflow :
 * 1. Upload photo ticket
 * 2. Tesseract extrait le texte
 * 3. LLM OpenAI analyse et suggère des codes EAN
 * 4. User valide les produits (Phase 1 puis Phase 2)
 * 5. Ajout à l'inventaire
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Catégorie de produit détectée par le LLM
 */
export const ProductCategorySchema = z.enum([
	'fresh_produce', // Fruits, légumes, vrac sans code-barres
	'packaged', // Produits emballés avec code-barres
	'non_food', // Produits non-alimentaires
	'unknown', // Catégorie indéterminée
]);

export type ProductCategory = z.infer<typeof ProductCategorySchema>;

/**
 * Statut de traitement d'un produit détecté
 */
export const ProductStatusSchema = z.enum([
	'pending', // En attente de validation
	'validated', // Validé par l'utilisateur (EAN sélectionné)
	'skipped', // Ignoré par l'utilisateur
	'problem', // Produit à problème (Phase 2)
]);

export type ProductStatus = z.infer<typeof ProductStatusSchema>;

/**
 * État du scan de ticket
 */
export const ReceiptScanStatusSchema = z.enum([
	'idle', // Pas de scan en cours
	'uploading', // Upload de la photo en cours
	'analyzing', // Analyse par Tesseract + LLM en cours
	'results', // Résultats disponibles
	'error', // Erreur survenue
]);

export type ReceiptScanStatus = z.infer<typeof ReceiptScanStatusSchema>;

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

/**
 * Suggestion de code EAN pour un produit
 *
 * Générée par le LLM OpenAI avec vérification internet
 */
export const EanSuggestionSchema = z.object({
	ean: z
		.string()
		.regex(/^\d{13}$/, 'Le code EAN doit contenir exactement 13 chiffres'),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe('Score de confiance entre 0 et 1'),
	brand: z.string().describe('Marque du produit'),
	productName: z.string().describe('Nom complet du produit'),
	image: z.string().nullable().describe("URL de l'image du produit ou null"),
});

export type EanSuggestion = z.infer<typeof EanSuggestionSchema>;

/**
 * Produit détecté sur le ticket avec suggestions EAN
 *
 * Résultat de l'analyse LLM après extraction Tesseract
 */
export const DetectedProductSchema = z.object({
	id: z.string().describe('Identifiant unique du produit détecté'),
	name: z.string().describe('Nom du produit (corrigé par le LLM)'),
	quantity: z.number().nullable().describe('Quantité détectée'),
	unitPrice: z.number().nullable().describe('Prix unitaire en euros'),
	totalPrice: z.number().nullable().describe('Prix total en euros'),

	// Catégorisation par le LLM (optionnel - calculé côté frontend si absent)
	category: ProductCategorySchema.optional()
		.default('unknown')
		.describe('Catégorie du produit'),
	requiresBarcode: z
		.boolean()
		.optional()
		.default(true)
		.describe('True si le produit nécessite un scan de code-barres'),

	// Suggestions EAN
	suggestedEans: z
		.array(EanSuggestionSchema)
		.describe('Liste de suggestions EAN (0 à 5)'),

	// État de validation (géré côté frontend)
	status: ProductStatusSchema.default('pending'),
	selectedEan: z
		.string()
		.regex(/^\d{13}$/)
		.nullable()
		.optional()
		.describe("Code EAN sélectionné par l'utilisateur"),

	// Métadonnées
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe('Confiance globale de détection'),
});

export type DetectedProduct = z.infer<typeof DetectedProductSchema>;

/**
 * Schéma pour transformer les données brutes du backend en DetectedProduct
 * Utilisé dans receiptService pour normaliser la réponse API
 */
export const BackendProductSchema = z.object({
	id: z.string().optional(),
	name: z.string(),
	quantity: z.number().nullable().optional(),
	unitPrice: z.number().nullable().optional(),
	totalPrice: z.number().nullable().optional(),
	confidence: z.number().min(0).max(1).optional(),
	suggestedEans: z
		.array(
			z.object({
				ean: z.string(),
				confidence: z.number().optional(),
				brand: z.string().optional(),
				productName: z.string().optional(),
				image: z.string().nullable().optional(),
			})
		)
		.optional(),
});

export type BackendProduct = z.infer<typeof BackendProductSchema>;

/**
 * Résultat complet de l'analyse d'un ticket
 *
 * Retourné par le backend après traitement Tesseract + LLM
 */
export const ReceiptAnalysisSchema = z.object({
	receiptId: z.string().describe('Identifiant unique du ticket'),
	merchantName: z.string().nullable().describe('Nom du magasin détecté'),
	purchaseDate: z.string().nullable().describe("Date d'achat au format ISO"),
	totalAmount: z.number().nullable().describe('Montant total en euros'),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("Confiance globale de l'analyse"),
	products: z
		.array(DetectedProductSchema)
		.describe('Liste des produits détectés'),

	// Métadonnées
	createdAt: z.string().optional().describe("Date de création de l'analyse"),
	processingTime: z.number().optional().describe('Temps de traitement en ms'),
});

export type ReceiptAnalysis = z.infer<typeof ReceiptAnalysisSchema>;

/**
 * État du processus de scan de ticket
 *
 * Utilisé dans le store Zustand pour gérer l'UI
 */
export const ReceiptScanStateSchema = z.object({
	status: ReceiptScanStatusSchema,
	currentReceiptId: z
		.string()
		.nullable()
		.describe('ID du ticket en cours de traitement'),
	analysis: ReceiptAnalysisSchema.nullable(),
	error: z.string().nullable(),

	// Statistiques
	phase1ProductsCount: z
		.number()
		.default(0)
		.describe('Nombre de produits bien identifiés'),
	phase2ProductsCount: z
		.number()
		.default(0)
		.describe('Nombre de produits à problème'),
	validatedProductsCount: z
		.number()
		.default(0)
		.describe('Nombre de produits validés'),
	skippedProductsCount: z
		.number()
		.default(0)
		.describe('Nombre de produits ignorés'),
});

export type ReceiptScanState = z.infer<typeof ReceiptScanStateSchema>;

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Payload pour l'upload d'un ticket
 */
export const UploadReceiptPayloadSchema = z.object({
	file: z
		.instanceof(File)
		.refine(
			(file) => file.size <= 5 * 1024 * 1024, // 5MB max
			'Le fichier ne doit pas dépasser 5MB'
		)
		.refine(
			(file) =>
				['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
			'Format acceptés : JPEG, PNG, WEBP'
		),
});

export type UploadReceiptPayload = z.infer<typeof UploadReceiptPayloadSchema>;

/**
 * Réponse de l'upload d'un ticket
 */
export const UploadReceiptResponseSchema = z.object({
	receiptId: z.string(),
	message: z.string().optional(),
});

export type UploadReceiptResponse = z.infer<typeof UploadReceiptResponseSchema>;

/**
 * Payload pour valider un produit avec un EAN sélectionné
 */
export const ValidateProductPayloadSchema = z.object({
	receiptId: z.string(),
	productId: z.string(),
	eanCode: z.string().regex(/^\d{13}$/),
});

export type ValidateProductPayload = z.infer<
	typeof ValidateProductPayloadSchema
>;

/**
 * Payload pour ajouter les produits validés à l'inventaire
 */
export const AddToInventoryPayloadSchema = z.object({
	receiptId: z.string(),
	products: z.array(
		z.object({
			productId: z.string(),
			eanCode: z
				.string()
				.regex(/^\d{13}$/)
				.nullable(),
			quantity: z.number().min(1),
			location: z.string().optional(),
		})
	),
});

export type AddToInventoryPayload = z.infer<typeof AddToInventoryPayloadSchema>;

/**
 * Payload pour créer manuellement un produit frais
 */
export const CreateManualProductPayloadSchema = z.object({
	name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
	quantity: z.number().min(1, 'La quantité doit être au moins 1'),
	unitPrice: z.number().min(0).nullable().optional(),
	category: z.string(),
	location: z.string().optional(),
});

export type CreateManualProductPayload = z.infer<
	typeof CreateManualProductPayloadSchema
>;

// ============================================================================
// HELPERS & UTILS
// ============================================================================

/**
 * Génère un ID unique pour un produit détecté
 */
export function generateProductId(): string {
	return `product_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 9)}`;
}

/**
 * Transforme un produit brut du backend en DetectedProduct normalisé
 */
export function normalizeBackendProduct(raw: BackendProduct): DetectedProduct {
	const suggestedEans: EanSuggestion[] = (raw.suggestedEans || []).map(
		(ean) => ({
			ean: ean.ean,
			confidence: ean.confidence ?? 0.5,
			brand: ean.brand ?? '-',
			productName: ean.productName ?? raw.name,
			image: ean.image ?? null,
		})
	);

	// Calculer la catégorie en fonction des suggestions EAN
	const category: ProductCategory =
		suggestedEans.length === 0 ? 'fresh_produce' : 'packaged';

	return {
		id: raw.id || generateProductId(),
		name: raw.name,
		quantity: raw.quantity ?? null,
		unitPrice: raw.unitPrice ?? null,
		totalPrice: raw.totalPrice ?? null,
		confidence: raw.confidence ?? 0.5,
		suggestedEans,
		category,
		requiresBarcode: category === 'packaged',
		status: 'pending',
		selectedEan: null,
	};
}

/**
 * Détermine si un produit est bien identifié (Phase 1)
 *
 * Critères : confidence > 0.5 ET au moins 3 suggestions EAN
 */
export function isPhase1Product(product: DetectedProduct): boolean {
	return product.confidence > 0.5 && product.suggestedEans.length >= 3;
}

/**
 * Détermine si un produit est à problème (Phase 2)
 *
 * Critères : confidence ≤ 0.5 OU moins de 3 suggestions EAN
 */
export function isPhase2Product(product: DetectedProduct): boolean {
	return !isPhase1Product(product);
}

/**
 * Sépare les produits en Phase 1 (bien identifiés) et Phase 2 (problèmes)
 */
export function separateProductsByPhase(products: DetectedProduct[]): {
	phase1: DetectedProduct[];
	phase2: DetectedProduct[];
} {
	const phase1 = products.filter(isPhase1Product);
	const phase2 = products.filter(isPhase2Product);

	return { phase1, phase2 };
}

/**
 * Calcule le taux de succès de l'analyse
 *
 * @returns Pourcentage de produits bien identifiés (0-100)
 */
export function calculateSuccessRate(analysis: ReceiptAnalysis): number {
	if (analysis.products.length === 0) return 0;

	const phase1Count = analysis.products.filter(isPhase1Product).length;
	return Math.round((phase1Count / analysis.products.length) * 100);
}

/**
 * Détermine les actions disponibles pour un produit selon son état
 */
export function getAvailableActions(product: DetectedProduct): string[] {
	const actions: string[] = [];

	// Produit avec suggestions
	if (product.suggestedEans.length > 0) {
		actions.push('select_ean');
	}

	// Toujours proposer scan code-barres (sauf pour fresh_produce)
	if (product.category !== 'fresh_produce') {
		actions.push('scan_barcode');
	}

	// Recherche manuelle
	if (product.category === 'packaged' || product.category === 'unknown') {
		actions.push('search_manual');
	}

	// Création manuelle (uniquement pour produits frais)
	if (product.category === 'fresh_produce' || !product.requiresBarcode) {
		actions.push('create_manual');
	}

	// Toujours permettre d'ignorer
	actions.push('skip');

	return actions;
}

/**
 * Formate le montant en euros
 */
export function formatAmount(amount: number | null): string {
	if (amount === null) return 'N/A';
	return `${amount.toFixed(2)}€`;
}

/**
 * Formate la date du ticket
 */
export function formatReceiptDate(date: string | null): string {
	if (!date) return 'Date inconnue';

	try {
		return new Intl.DateTimeFormat('fr-FR', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(date));
	} catch {
		return 'Date invalide';
	}
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Limite de taille pour l'upload de tickets
 */
export const MAX_RECEIPT_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Formats d'image acceptés
 */
export const ACCEPTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Temps maximum d'analyse avant timeout
 */
export const ANALYSIS_TIMEOUT_MS = 60000; // 60 secondes

/**
 * Seuils de confiance
 */
export const CONFIDENCE_THRESHOLDS = {
	HIGH: 0.7, // Haute confiance (affichage vert)
	MEDIUM: 0.5, // Confiance moyenne (seuil Phase 1)
	LOW: 0.3, // Faible confiance (affichage jaune)
} as const;

/**
 * Messages d'erreur standardisés
 */
export const RECEIPT_ERROR_MESSAGES = {
	UPLOAD_FAILED: "Échec de l'upload du ticket. Vérifiez votre connexion.",
	ANALYSIS_FAILED:
		"L'analyse du ticket a échoué. Réessayez avec une photo plus nette.",
	ANALYSIS_TIMEOUT: "L'analyse prend trop de temps. Veuillez réessayer.",
	OCR_FAILED:
		"Le texte du ticket n'a pas pu être extrait. Essayez avec une meilleure photo.",
	NO_PRODUCTS_FOUND: "Aucun produit n'a été détecté sur le ticket.",
	NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion internet.',
} as const;
