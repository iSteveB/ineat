import {
	OffProductResponse,
	OffProduct,
	OffError,
	OffApiConfig,
	OffProductParams,
} from '@/schemas/openfoodfact';
import { Product } from '@/schemas/product'; 
/**
 * Service pour interagir avec l'API OpenFoodFacts
 * Documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
export class OpenFoodFactsService {
	private readonly config: OffApiConfig;

	constructor(config?: Partial<OffApiConfig>) {
		this.config = {
			baseUrl: config?.baseUrl || 'https://world.openfoodfacts.org',
			userAgent:
				config?.userAgent || 'MonInventaire/1.0 (contact@monapp.com)',
			timeout: config?.timeout || 10000, // 10 secondes
		};
	}

	/**
	 * Récupère un produit par son code-barre
	 * @param barcode Code-barre du produit (sera normalisé automatiquement par OFF)
	 * @param fields Champs spécifiques à récupérer (optionnel)
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

			// Construction de l'URL
			const url = this.buildProductUrl({ barcode, fields, lc: language });

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
	 * Mappe un produit OpenFoodFacts vers notre schéma Product local
	 * @param offProduct Produit OFF
	 * @returns Produit local partiellement rempli
	 */
	mapToLocalProduct(offProduct: OffProduct): Partial<Product> {
		return {
			name:
				offProduct.product_name ||
				offProduct.product_name_fr ||
				offProduct.product_name_en ||
				'-',
			brand: offProduct.brands || '-',
		};
	}

	/**
	 * Récupère l'URL de l'image principale du produit
	 * @param offProduct Produit OFF
	 * @param size Taille souhaitée ('100', '200', '400', 'full')
	 * @param language Langue préférée
	 * @returns URL de l'image ou null
	 */
	getProductImageUrl(
		offProduct: OffProduct,
		size: '100' | '200' | '400' | 'full' = '400',
		language: string = 'fr'
	): string | null {
		// Priorité aux images sélectionnées
		const selectedImage = offProduct.selected_images?.front;
		if (selectedImage) {
			// Essayer d'abord la langue demandée, puis français, puis anglais
			const langs = [language, 'fr', 'en'];
			for (const lang of langs) {
				const imageData =
					selectedImage.display?.[lang] ||
					selectedImage.small?.[lang];
				if (imageData) {
					// Si c'est une URL directe, la retourner
					if (typeof imageData === 'string') {
						return imageData;
					}
				}
			}
		}

		// Construction manuelle de l'URL si on a les données d'image
		if (offProduct.images && offProduct.code) {
			const frontImage =
				offProduct.images[`front_${language}`] ||
				offProduct.images['front_fr'] ||
				offProduct.images['front_en'];
			if (frontImage && 'rev' in frontImage && 'imgid' in frontImage) {
				const folderPath = this.buildImageFolderPath(offProduct.code);
				const sizeStr = size === 'full' ? 'full' : size;
				return `https://images.openfoodfacts.org/images/products/${folderPath}/front_${language}.${frontImage.rev}.${sizeStr}.jpg`;
			}
		}

		// Fallback sur image_front_url (mais sans contrôle de la taille)
		return offProduct.image_front_url || null;
	}

	// --- Méthodes privées ---

	/**
	 * Valide un code-barre basiquement
	 */
	private isValidBarcode(barcode: string): boolean {
		// Accepte les codes numériques de 8 à 13 chiffres
		return /^\d{8,13}$/.test(barcode.trim());
	}

	/**
	 * Construit l'URL pour récupérer un produit
	 */
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

	/**
	 * Fetch avec timeout
	 */
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

	/**
	 * Extrait la catégorie principale depuis categories_tags_en comme string
	 * (Utile pour affichage d'information mais pas pour le mapping automatique)
	 */
	getMainCategoryString(offProduct: OffProduct): string {
		const categories = offProduct.categories_tags_en;
		if (!categories || categories.length === 0) {
			return '-';
		}

		// Prendre la catégorie la plus spécifique (souvent la dernière)
		const mainCategory = categories[categories.length - 1];

		// Nettoyer le nom (enlever préfixe "en:" et formatter)
		return mainCategory
			.replace(/^en:/, '')
			.replace(/-/g, ' ')
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	/**
	 * Construit le chemin du dossier d'images à partir du code-barre
	 * Exemple: "3435660768163" -> "343/566/076/8163"
	 */
	private buildImageFolderPath(barcode: string): string {
		// Pad avec des 0 si moins de 13 chiffres
		const paddedBarcode = barcode.padStart(13, '0');

		// Split en groupes: 3/3/3/reste
		const part1 = paddedBarcode.slice(0, 3);
		const part2 = paddedBarcode.slice(3, 6);
		const part3 = paddedBarcode.slice(6, 9);
		const part4 = paddedBarcode.slice(9);

		return `${part1}/${part2}/${part3}/${part4}`;
	}

	/**
	 * Crée une erreur OFF typée
	 */
	private createError(
		type: OffError['type'],
		message: string,
		details?: unknown
	): OffError {
		return { type, message, details };
	}

	/**
	 * Vérifie si une erreur est de type OffError
	 */
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
		baseUrl: 'https://world.openfoodfacts.net', // Staging
		userAgent: 'MonInventaire-Test/1.0 (contact@monapp.com)',
		timeout: 5000,
	});
};
