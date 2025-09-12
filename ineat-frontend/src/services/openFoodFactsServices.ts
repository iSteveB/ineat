/**
 * Extension du service OpenFoodFacts existant avec enrichissement
 * Modifications à apporter au fichier openFoodFactsServices.ts
 */

import {
	OffProductResponse,
	OffProduct,
	OffError,
	OffApiConfig,
	OffProductParams,
	OFF_DEFAULT_FIELDS,
	OffNutriments,
} from '@/schemas/openfoodfact';

import {
	OpenFoodFactsMapping,
	NutrientMapping,
	DataQualityInfo,
	MappingOptions,
	NUTRI_SCORE_MAPPING,
	ECO_SCORE_MAPPING,
	NOVA_SCORE_MAPPING,
	QUALITY_THRESHOLDS,
	MAPPING_ERROR_MESSAGES,
} from '@/schemas/openfoodfact-mapping';

import { NutriScore, EcoScore, NovaScore } from '@/schemas/base';
import { Product } from '@/schemas/product';

/**
 * Service pour interagir avec l'API OpenFoodFacts - VERSION ENRICHIE
 * Documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
export class OpenFoodFactsService {
	private readonly config: OffApiConfig;

	constructor(config?: Partial<OffApiConfig>) {
		this.config = {
			baseUrl: config?.baseUrl || 'https://world.openfoodfacts.net',
			userAgent:
				config?.userAgent || 'MonInventaire/1.0 (contact@monapp.com)',
			timeout: config?.timeout || 10000, // 10 secondes
		};
	}

	/**
	 * Récupère un produit par son code-barre
	 * @param barcode Code-barre du produit (sera normalisé automatiquement par OFF)
	 * @param fields Champs spécifiques à récupérer (optionnel - utilise OFF_DEFAULT_FIELDS par défaut)
	 * @param language Code langue (fr, en, etc.)
	 * @returns Produit OFF ou null si non trouvé
	 * @throws OffError en cas d'erreur
	 */
	async getProductByBarcode(
		barcode: string,
		fields?: string[],
		language: string = 'fr'
	): Promise<OffProduct | null> {
		try {
			// Validation basique du code-barre
			if (!this.isValidBarcode(barcode)) {
				throw this.createError(
					'INVALID_BARCODE',
					`Code-barre invalide: ${barcode}`
				);
			}

			// Utiliser les champs enrichis par défaut
			const fieldsToUse = fields || OFF_DEFAULT_FIELDS.slice();

			// Construction de l'URL
			const url = this.buildProductUrl({
				barcode,
				fields: fieldsToUse,
				lc: language,
			});

			// Appel API avec timeout
			const response = await this.fetchWithTimeout(url, {
				method: 'GET',
				headers: {
					'User-Agent': this.config.userAgent,
					Accept: 'application/json',
				},
			});

			// Vérification de la réponse HTTP
			if (!response.ok) {
				if (response.status === 429) {
					throw this.createError(
						'RATE_LIMIT',
						'Limite de taux dépassée. Veuillez patienter.'
					);
				}
				if (response.status === 404) {
					throw this.createError(
						'PRODUCT_NOT_FOUND',
						'Produit non trouvé.'
					);
				}
				throw this.createError(
					'API_ERROR',
					`Erreur API: ${response.status} ${response.statusText}`
				);
			}

			// Parse de la réponse JSON
			const data: OffProductResponse = await response.json();

			// Gestion du statut OFF
			if (data.status === 0) {
				return null; // Produit non trouvé
			}

			if (data.status !== 1 || !data.product) {
				throw this.createError(
					'API_ERROR',
					`Réponse API inattendue: ${data.status_verbose}`
				);
			}

			return data.product;
		} catch (error: unknown) {
			// Re-throw si c'est déjà une OffError
			if (this.isOffError(error)) {
				throw error;
			}

			// Gestion des erreurs réseau
			if (error instanceof TypeError && error.message.includes('fetch')) {
				throw this.createError(
					'NETWORK_ERROR',
					'Impossible de contacter OpenFoodFacts. Vérifiez votre connexion.'
				);
			}

			// Erreur inconnue
			throw this.createError('UNKNOWN_ERROR', 'Erreur inattendue', error);
		}
	}

	/**
	 * NOUVELLE MÉTHODE - Récupère un produit avec mapping enrichi complet
	 */
	async getEnrichedProductByBarcode(
		barcode: string,
		options: Partial<MappingOptions> = {}
	): Promise<OpenFoodFactsMapping | null> {
		// Récupération avec tous les champs enrichis
		const offProduct = await this.getProductByBarcode(
			barcode,
			OFF_DEFAULT_FIELDS.slice(), // Utilise les champs enrichis du schema
			options.preferredLanguage || 'fr'
		);

		if (!offProduct) {
			return null;
		}

		// Mapping enrichi
		return this.mapToEnrichedProduct(offProduct, barcode, options);
	}

	/**
	 * NOUVELLE MÉTHODE - Mappe un produit OpenFoodFacts vers notre format enrichi
	 * CORRIGÉ: Inclut maintenant les propriétés de base (name, brand, barcode)
	 */
	mapToEnrichedProduct(
		offProduct: OffProduct,
		barcode: string,
		options: Partial<MappingOptions> = {}
	): OpenFoodFactsMapping {
		const defaultOptions: MappingOptions = {
			preferredLanguage: 'fr',
			requireMinimalNutrients: false,
			requireImage: false,
			requireIngredients: false,
			qualityThreshold: QUALITY_THRESHOLDS.ACCEPTABLE,
		};

		const config = { ...defaultOptions, ...options };

		// CORRECTION: Mapping des propriétés de base
		const name =
			offProduct.product_name ||
			offProduct.product_name_fr ||
			offProduct.product_name_en ||
			'Produit scanné';

		const brand = offProduct.brands || undefined;

		// Utiliser le code-barre fourni ou celui du produit
		const productBarcode = offProduct.code || barcode;

		// Mapping des scores
		const nutriscore = this.mapNutriScore(offProduct.nutriscore_grade);
		const ecoScore = this.mapEcoScore(offProduct.ecoscore_grade);
		const novaScore = this.mapNovaScore(offProduct.nova_group);

		// Mapping des nutriments
		const nutrients = this.mapNutrients(offProduct.nutriments);

		// Sélection de l'image optimale
		const imageUrl = this.selectBestImage(offProduct);

		// Sélection des ingrédients dans la langue préférée
		const ingredients = this.selectIngredients(
			offProduct,
			config.preferredLanguage
		);

		// Évaluation de la qualité des données
		const quality = this.assessDataQuality(
			offProduct,
			nutrients,
			imageUrl,
			ingredients
		);

		return {
			// AJOUT: Propriétés de base manquantes
			id: productBarcode,
			name: name,
			brand: brand,
			barcode: productBarcode,

			// Propriétés enrichies existantes
			nutriscore: nutriscore || undefined,
			ecoScore: ecoScore || undefined,
			novaScore: novaScore || undefined,
			nutrients: nutrients || undefined,
			imageUrl: imageUrl || undefined,
			ingredients: ingredients || undefined,
			quality,
			mappedAt: new Date(),
			sourceLanguage: config.preferredLanguage,
		};
	}

	/**
	 * Mappe un produit OpenFoodFacts vers notre schéma Product local (MÉTHODE EXISTANTE AMÉLIORÉE)
	 * @param offProduct Produit OFF
	 * @returns Produit local partiellement rempli avec enrichissement
	 */
	mapToLocalProduct(offProduct: OffProduct): Partial<Product> {
		return {
			// Champs de base (existants)
			name:
				offProduct.product_name ||
				offProduct.product_name_fr ||
				offProduct.product_name_en ||
				'-',
			brand: offProduct.brands || '-',

			// ENRICHISSEMENT - Nouveaux champs (uniquement si la migration Prisma est appliquée)
			// Scores
			nutriscore:
				this.mapNutriScore(offProduct.nutriscore_grade) || undefined,
			ecoScore: this.mapEcoScore(offProduct.ecoscore_grade) || undefined,
			novaScore: this.mapNovaScore(offProduct.nova_group) || undefined,

			// Données nutritionnelles (JSON)
			nutrients: this.mapNutrients(offProduct.nutriments) || undefined,

			// Image
			imageUrl: this.selectBestImage(offProduct) || undefined,

			// Ingrédients
			ingredients: this.selectIngredients(offProduct, 'fr') || undefined,

			// ID externe pour référence
			externalId: offProduct.code,
		};
	}

	// ===== NOUVELLES MÉTHODES DE MAPPING PRIVÉES =====

	/**
	 * Mappe les scores Nutri-Score d'OpenFoodFacts vers nos enums
	 */
	private mapNutriScore(grade?: string): NutriScore | null {
		if (!grade) return null;

		const normalized =
			grade.toUpperCase() as keyof typeof NUTRI_SCORE_MAPPING;
		return NUTRI_SCORE_MAPPING[normalized] || null;
	}

	/**
	 * Mappe les scores Eco-Score d'OpenFoodFacts vers nos enums
	 */
	private mapEcoScore(grade?: string): EcoScore | null {
		if (!grade) return null;

		const normalized =
			grade.toUpperCase() as keyof typeof ECO_SCORE_MAPPING;
		return ECO_SCORE_MAPPING[normalized] || null;
	}

	/**
	 * Mappe les groupes Nova d'OpenFoodFacts vers nos enums
	 */
	private mapNovaScore(group?: number): NovaScore | null {
		if (!group || group < 1 || group > 4) return null;
		return (
			NOVA_SCORE_MAPPING[group as keyof typeof NOVA_SCORE_MAPPING] || null
		);
	}

	/**
	 * Extrait et structure les données nutritionnelles
	 */
	private mapNutrients(nutriments?: OffNutriments): NutrientMapping | null {
		if (!nutriments) return null;

		// Vérifier qu'on a au moins quelques données de base
		const hasBasicData = !!(
			nutriments.carbohydrates_100g !== undefined ||
			nutriments.proteins_100g !== undefined ||
			nutriments.fat_100g !== undefined
		);

		if (!hasBasicData) return null;

		// Extraction des macronutriments principaux avec fallback à 0
		const nutrients: NutrientMapping = {
			carbohydrates: nutriments.carbohydrates_100g || 0,
			proteins: nutriments.proteins_100g || 0,
			fats: nutriments.fat_100g || 0,
			salt: nutriments.salt_100g || 0,
		};

		// Ajout des données optionnelles si disponibles
		if (nutriments['energy-kcal_100g']) {
			nutrients.energy = nutriments['energy-kcal_100g'];
		}

		if (nutriments.sugars_100g !== undefined) {
			nutrients.sugars = nutriments.sugars_100g;
		}

		if (nutriments.sodium_100g !== undefined) {
			nutrients.sodium = nutriments.sodium_100g;
		}

		// Métadonnées
		nutrients.dataPer = '100g';
		nutrients.lastUpdated = Date.now();

		return nutrients;
	}

	/**
	 * Sélectionne la meilleure image disponible selon la priorité
	 */
	private selectBestImage(product: OffProduct): string | null {
		// Priorité : image_front_url > images dans selected_images
		if (product.image_front_url) {
			return product.image_front_url;
		}

		// Essayer selected_images
		const selectedImage = product.selected_images?.front;
		if (selectedImage) {
			// Priorité français > anglais
			const imageUrl =
				selectedImage.display?.fr ||
				selectedImage.display?.en ||
				selectedImage.small?.fr ||
				selectedImage.small?.en;

			if (imageUrl) return imageUrl;
		}

		return null;
	}

	/**
	 * Sélectionne le texte d'ingrédients dans la langue préférée
	 */
	private selectIngredients(
		product: OffProduct,
		language: 'fr' | 'en' = 'fr'
	): string | null {
		// Priorité selon la langue préférée
		if (language === 'fr' && product.ingredients_text_fr) {
			return product.ingredients_text_fr;
		}

		if (language === 'en' && product.ingredients_text_en) {
			return product.ingredients_text_en;
		}

		// Fallback vers la version générale
		return product.ingredients_text || null;
	}

	/**
	 * Évalue la qualité des données récupérées
	 */
	private assessDataQuality(
		product: OffProduct,
		nutrients: NutrientMapping | null,
		imageUrl: string | null,
		ingredients: string | null
	): DataQualityInfo {
		const warnings: string[] = [];

		// Vérifications de base
		const hasName = !!(
			product.product_name ||
			product.product_name_fr ||
			product.product_name_en
		);
		const hasBrand = !!product.brands;
		const hasBasicInfo = hasName && hasBrand;

		// Calcul du score de complétude basé sur les champs disponibles
		let completenessScore = 0;
		const totalFields = 10;

		if (hasName) completenessScore += 1;
		if (hasBrand) completenessScore += 1;
		if (product.nutriscore_grade) completenessScore += 1;
		if (product.ecoscore_grade) completenessScore += 1;
		if (product.nova_group) completenessScore += 1;
		if (nutrients) completenessScore += 2; // Vaut double
		if (imageUrl) completenessScore += 1;
		if (ingredients) completenessScore += 1;
		if (product.categories_tags_en?.length) completenessScore += 1;

		const completeness = completenessScore / totalFields;

		// Ajout des warnings
		if (!hasName) warnings.push(MAPPING_ERROR_MESSAGES.MISSING_NAME);
		if (!hasBrand) warnings.push(MAPPING_ERROR_MESSAGES.MISSING_BRAND);
		if (!nutrients)
			warnings.push(MAPPING_ERROR_MESSAGES.INSUFFICIENT_NUTRIENTS);
		if (!imageUrl) warnings.push(MAPPING_ERROR_MESSAGES.NO_IMAGE);
		if (!ingredients) warnings.push(MAPPING_ERROR_MESSAGES.NO_INGREDIENTS);

		return {
			completeness,
			lastModified: product.last_modified_t,
			hasMinimalData: hasBasicInfo,
			hasNutritionalData: !!nutrients,
			hasScores: !!(
				product.nutriscore_grade ||
				product.ecoscore_grade ||
				product.nova_group
			),
			hasImage: !!imageUrl,
			hasIngredients: !!ingredients,
			warningMessages: warnings,
		};
	}

	// ===== MÉTHODES EXISTANTES (inchangées) =====

	/**
	 * Récupère l'URL de l'image principale du produit
	 */
	getProductImageUrl(
		offProduct: OffProduct,
		size: '100' | '200' | '400' | 'full' = '400',
		language: string = 'fr'
	): string | null {
		// Code existant inchangé...
		const selectedImage = offProduct.selected_images?.front;
		if (selectedImage) {
			const langs = [language, 'fr', 'en'];
			for (const lang of langs) {
				const imageData =
					selectedImage.display?.[lang] ||
					selectedImage.small?.[lang];
				if (imageData) {
					if (typeof imageData === 'string') {
						return imageData;
					}
				}
			}
		}

		if (offProduct.images && offProduct.code) {
			const frontImage =
				offProduct.images[`front_${language}`] ||
				offProduct.images['front_fr'] ||
				offProduct.images['front_en'];
			if (frontImage && 'rev' in frontImage && 'imgid' in frontImage) {
				const folderPath = this.buildImageFolderPath(offProduct.code);
				const sizeStr = size === 'full' ? 'full' : size;
				return `https://images.openfoodfacts.net/images/products/${folderPath}/front_${language}.${frontImage.rev}.${sizeStr}.jpg`;
			}
		}

		return offProduct.image_front_url || null;
	}

	// Toutes les autres méthodes privées restent identiques...
	private isValidBarcode(barcode: string): boolean {
		return /^\d{8,13}$/.test(barcode.trim());
	}

	private buildProductUrl(params: OffProductParams): string {
		const { barcode, fields, lc } = params;
		let url = `${this.config.baseUrl}/api/v2/product/${barcode}`;

		const queryParams: string[] = [];

		if (fields && fields.length > 0) {
			queryParams.push(`fields=${fields.join(',')}`);
		}

		if (lc) {
			queryParams.push(`lc=${lc}`);
		}

		if (queryParams.length > 0) {
			url += `?${queryParams.join('&')}`;
		}

		return url;
	}

	private async fetchWithTimeout(
		url: string,
		options: RequestInit
	): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout(
			() => controller.abort(),
			this.config.timeout
		);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			return response;
		} catch (error: unknown) {
			clearTimeout(timeoutId);
			throw error;
		}
	}

	getMainCategoryString(offProduct: OffProduct): string {
		const categories = offProduct.categories_tags_en;
		if (!categories || categories.length === 0) {
			return '-';
		}

		const mainCategory = categories[categories.length - 1];

		return mainCategory
			.replace(/^en:/, '')
			.replace(/-/g, ' ')
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	private buildImageFolderPath(barcode: string): string {
		const paddedBarcode = barcode.padStart(13, '0');
		const part1 = paddedBarcode.slice(0, 3);
		const part2 = paddedBarcode.slice(3, 6);
		const part3 = paddedBarcode.slice(6, 9);
		const part4 = paddedBarcode.slice(9);

		return `${part1}/${part2}/${part3}/${part4}`;
	}

	private createError(
		type: OffError['type'],
		message: string,
		details?: unknown
	): OffError {
		return { type, message, details };
	}

	private isOffError(error: unknown): error is OffError {
		return (
			typeof error === 'object' &&
			error !== null &&
			'type' in error &&
			'message' in error
		);
	}
}

// Instance par défaut exportée
export const openFoodFactsService = new OpenFoodFactsService();

// Configuration pour l'environnement de test
export const createTestOpenFoodFactsService = (): OpenFoodFactsService => {
	return new OpenFoodFactsService({
		baseUrl: 'https://world.openfoodfacts.net',
		userAgent: 'MonInventaire-Test/1.0 (contact@monapp.com)',
		timeout: 5000,
	});
};
