/**
 * Service de gestion des tickets de caisse (receipts)
 *
 * Workflow complet :
 * 1. Upload photo ticket → Cloudinary + Tesseract OCR
 * 2. Analyse LLM OpenAI → Suggestions EAN avec vérification internet
 * 3. Validation utilisateur → Phase 1 (bien identifiés) puis Phase 2 (problèmes)
 * 4. Ajout à l'inventaire → Enrichissement OpenFoodFacts
 */

import type {
	ReceiptAnalysis,
	UploadReceiptResponse,
	ValidateProductPayload,
	AddToInventoryPayload,
	CreateManualProductPayload,
	BackendProduct,
} from '@/schemas/receipt';
import { normalizeBackendProduct } from '@/schemas/receipt';

// ===== TYPES COMPLÉMENTAIRES =====

/**
 * Réponse du polling de statut
 */
export interface ReceiptStatusResponse {
	receiptId: string;
	status: 'uploading' | 'analyzing' | 'completed' | 'error';
	progress: number;
	currentStep: 'upload' | 'ocr' | 'llm' | 'enrichment' | 'done';
	estimatedTimeRemaining: number | null;
	errorMessage: string | null;
}

/**
 * Résultat de recherche manuelle OpenFoodFacts
 */
export interface ProductSearchResult {
	ean: string;
	name: string;
	brand: string;
	image: string | null;
	nutriScore: string | null;
	categories: string[];
}

/**
 * Filtres pour l'historique
 */
export interface ReceiptHistoryFilters {
	startDate?: string;
	endDate?: string;
	minAmount?: number;
	maxAmount?: number;
	merchantName?: string;
	limit?: number;
	offset?: number;
}

/**
 * Item de l'historique
 */
export interface ReceiptHistoryItem {
	receiptId: string;
	merchantName: string | null;
	purchaseDate: string | null;
	totalAmount: number | null;
	productsCount: number;
	validatedProductsCount: number;
	imageUrl: string;
	createdAt: string;
}

/**
 * Réponse de l'historique
 */
export interface ReceiptHistoryResponse {
	receipts: ReceiptHistoryItem[];
	total: number;
	limit: number;
	offset: number;
}

/**
 * Réponse brute du backend pour l'analyse
 */
interface BackendReceiptAnalysis {
	id?: string;
	receiptId?: string;
	merchantName?: string | null;
	purchaseDate?: string | null;
	totalAmount?: number | null;
	confidence?: number;
	ocrConfidence?: number;
	processingTime?: number;
	createdAt?: string;
	items?: BackendProduct[];
	products?: BackendProduct[];
}

// ===== SERVICE =====

/**
 * URL de base de l'API
 */
const API_URL = `${import.meta.env.VITE_API_URL}/api`;

/**
 * Service de gestion des tickets de caisse
 */
class ReceiptService {
	/**
	 * Upload un ticket de caisse pour traitement OCR + LLM
	 *
	 * @param file - Fichier image du ticket
	 * @returns Réponse avec le receiptId pour suivre le traitement
	 * @throws Error si l'upload échoue ou si le fichier est invalide
	 */
	async uploadReceipt(file: File): Promise<UploadReceiptResponse> {
		try {
			// Validation côté client
			const maxSize = 5 * 1024 * 1024; // 5MB
			if (file.size > maxSize) {
				throw new Error('Le fichier est trop volumineux (maximum 5MB)');
			}

			const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
			if (!allowedTypes.includes(file.type)) {
				throw new Error(
					'Format de fichier non supporté (formats acceptés: JPEG, PNG, WEBP)'
				);
			}

			// Création du FormData
			const formData = new FormData();
			formData.append('file', file);
			formData.append('documentType', 'receipt_image'); 

			const response = await fetch(`${API_URL}/receipt/upload`, {
				method: 'POST',
				credentials: 'include',
				body: formData,
			});

			if (!response.ok) {
				let errorMessage = "Erreur lors de l'upload";

				try {
					const errorData = await response.json();
					errorMessage = errorData.message || errorMessage;

					// Détection d'erreur Cloudinary spécifique
					if (
						errorMessage.includes('Cloudinary') ||
						errorMessage.includes('Invalid Signature')
					) {
						throw new Error(
							'⚠️ Erreur de configuration Cloudinary côté serveur.\n' +
								'Veuillez vérifier les credentials dans le .env backend.'
						);
					}
				} catch {
					// Si on ne peut pas parser le JSON, utiliser le message par défaut
				}

				throw new Error(errorMessage);
			}

			const data = await response.json();

			return {
				receiptId: data.data?.receiptId || data.receiptId || data.id,
			};
		} catch (error) {
			console.error('Erreur upload receipt:', error);
			if (error instanceof Error) {
				throw error;
			}
			throw new Error("Erreur lors de l'upload du ticket");
		}
	}

	/**
	 * Récupère le statut en temps réel d'un ticket en cours de traitement
	 *
	 * Utilisé pour le polling pendant l'analyse (Tesseract + LLM)
	 *
	 * @param receiptId - ID du ticket
	 * @returns Statut actuel avec progression
	 */
	async getReceiptStatus(receiptId: string): Promise<ReceiptStatusResponse> {
		const response = await fetch(`${API_URL}/receipt/${receiptId}/status`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			let errorMessage = 'Erreur lors de la récupération du statut';
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;
			} catch {
				// Ignore parsing error
			}

			throw new Error(errorMessage);
		}

		const data = await response.json();
		console.log('📊 Status response:', data);

		// Extraire les données (support multiple formats de réponse)
		const responseData = data.data || data;

		// Mapper le statut backend (PROCESSING, COMPLETED, FAILED) vers frontend
		const backendStatus = responseData.status;
		let mappedStatus: 'uploading' | 'analyzing' | 'completed' | 'error';

		switch (backendStatus) {
			case 'PENDING':
			case 'PROCESSING':
				mappedStatus = 'analyzing';
				break;
			case 'COMPLETED':
			case 'VALIDATED':
				mappedStatus = 'completed';
				break;
			case 'FAILED':
				mappedStatus = 'error';
				break;
			default:
				mappedStatus = 'analyzing';
		}

		return {
			receiptId: responseData.receiptId || responseData.id || receiptId,
			status: mappedStatus,
			progress: responseData.progress || 50,
			currentStep: responseData.currentStep || 'ocr',
			estimatedTimeRemaining: responseData.estimatedTimeRemaining || null,
			errorMessage: responseData.errorMessage || null,
		};
	}

	/**
	 * Récupère les résultats complets d'un ticket traité
	 *
	 * Contient les métadonnées du ticket et tous les produits détectés
	 * avec leurs suggestions EAN vérifiées par le LLM
	 *
	 * @param receiptId - ID du ticket
	 * @returns Analyse complète avec produits et suggestions EAN
	 */
	async getReceiptAnalysis(receiptId: string): Promise<ReceiptAnalysis> {
		const response = await fetch(
			`${API_URL}/receipt/${receiptId}/analysis`,
			{
				method: 'GET',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);

		if (!response.ok) {
			let errorMessage = 'Erreur lors de la récupération des résultats';
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;
			} catch {
				// Ignore parsing error
			}

			throw new Error(errorMessage);
		}

		const data = await response.json();
		console.log('📊 Analysis response:', data);

		// Extraire les données brutes (support multiple formats)
		const rawAnalysis: BackendReceiptAnalysis = data.data || data;

		// Normaliser la réponse vers le format attendu par le frontend
		return this.normalizeAnalysisResponse(rawAnalysis, receiptId);
	}

	/**
	 * Normalise la réponse brute du backend vers ReceiptAnalysis
	 */
	private normalizeAnalysisResponse(
		raw: BackendReceiptAnalysis,
		receiptId: string
	): ReceiptAnalysis {
		// Les produits peuvent être dans 'items' ou 'products'
		const rawProducts: BackendProduct[] = raw.items || raw.products || [];

		// Normaliser chaque produit avec la fonction helper
		const normalizedProducts = rawProducts.map((product) =>
			normalizeBackendProduct(product)
		);

		return {
			receiptId: raw.receiptId || raw.id || receiptId,
			merchantName: raw.merchantName ?? null,
			purchaseDate: raw.purchaseDate ?? null,
			totalAmount: raw.totalAmount ?? null,
			confidence: raw.confidence ?? raw.ocrConfidence ?? 0.5,
			products: normalizedProducts,
			createdAt: raw.createdAt,
			processingTime: raw.processingTime,
		};
	}

	/**
	 * Valide un produit avec un code EAN sélectionné
	 *
	 * Appelé quand l'utilisateur sélectionne un EAN parmi les suggestions
	 *
	 * @param payload - receiptId, productId, eanCode
	 */
	async validateProduct(payload: ValidateProductPayload): Promise<void> {
		const { receiptId, productId, eanCode } = payload;

		const response = await fetch(
			`${API_URL}/receipt/${receiptId}/products/${productId}/validate`,
			{
				method: 'PUT',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ eanCode }),
			}
		);

		if (!response.ok) {
			let errorMessage = 'Erreur lors de la validation du produit';
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;
			} catch {
				// Ignore parsing error
			}

			throw new Error(errorMessage);
		}
	}

	/**
	 * Recherche manuelle de produits sur OpenFoodFacts
	 *
	 * Utilisé en Phase 2 quand l'utilisateur veut chercher manuellement
	 *
	 * @param query - Terme de recherche (ex: "Orangina 33cl")
	 * @returns Liste de produits correspondants
	 */
	async searchProducts(query: string): Promise<ProductSearchResult[]> {
		const response = await fetch(
			`${API_URL}/products/search?q=${encodeURIComponent(query)}`,
			{
				method: 'GET',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);

		if (!response.ok) {
			let errorMessage = 'Erreur lors de la recherche';
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;
			} catch {
				// Ignore parsing error
			}

			throw new Error(errorMessage);
		}

		const data = await response.json();
		return data.results || data.data || [];
	}

	/**
	 * Crée manuellement un produit frais sans code-barres
	 *
	 * Utilisé pour les fruits, légumes, produits en vrac
	 *
	 * @param receiptId - ID du ticket
	 * @param productId - ID du produit détecté à remplacer
	 * @param payload - Données du produit à créer
	 */
	async createManualProduct(
		receiptId: string,
		productId: string,
		payload: CreateManualProductPayload
	): Promise<void> {
		const response = await fetch(
			`${API_URL}/receipt/${receiptId}/products/${productId}/create-manual`,
			{
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			}
		);

		if (!response.ok) {
			let errorMessage = 'Erreur lors de la création du produit';
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;
			} catch {
				// Ignore parsing error
			}

			throw new Error(errorMessage);
		}
	}

	/**
	 * Ignore un produit détecté
	 *
	 * Le produit ne sera pas ajouté à l'inventaire
	 *
	 * @param receiptId - ID du ticket
	 * @param productId - ID du produit à ignorer
	 */
	async skipProduct(receiptId: string, productId: string): Promise<void> {
		const response = await fetch(
			`${API_URL}/receipt/${receiptId}/products/${productId}/skip`,
			{
				method: 'PUT',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);

		if (!response.ok) {
			let errorMessage = "Erreur lors de l'ignorage du produit";
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;
			} catch {
				// Ignore parsing error
			}

			throw new Error(errorMessage);
		}
	}

	/**
	 * Ajoute tous les produits validés du ticket à l'inventaire
	 *
	 * Étape finale après validation de tous les produits
	 * Enrichit automatiquement les produits via OpenFoodFacts
	 *
	 * @param payload - receiptId et liste des produits à ajouter
	 */
	async addToInventory(payload: AddToInventoryPayload): Promise<void> {
		const { receiptId, products } = payload;

		const response = await fetch(
			`${API_URL}/receipt/${receiptId}/add-to-inventory`,
			{
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ products }),
			}
		);

		if (!response.ok) {
			let errorMessage =
				"Erreur lors de l'ajout des produits à l'inventaire";
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;
			} catch {
				// Ignore parsing error
			}

			throw new Error(errorMessage);
		}
	}

	/**
	 * Récupère l'historique des tickets scannés
	 *
	 * Avec filtres optionnels (dates, montant, magasin)
	 *
	 * @param filters - Filtres optionnels
	 * @returns Liste paginée des tickets
	 */
	async getReceiptHistory(
		filters: ReceiptHistoryFilters = {}
	): Promise<ReceiptHistoryResponse> {
		// Construction des query params
		const params = new URLSearchParams();

		if (filters.startDate) {
			params.append('startDate', filters.startDate);
		}
		if (filters.endDate) {
			params.append('endDate', filters.endDate);
		}
		if (filters.minAmount !== undefined) {
			params.append('minAmount', filters.minAmount.toString());
		}
		if (filters.maxAmount !== undefined) {
			params.append('maxAmount', filters.maxAmount.toString());
		}
		if (filters.merchantName) {
			params.append('merchantName', filters.merchantName);
		}
		if (filters.limit !== undefined) {
			params.append('limit', filters.limit.toString());
		}
		if (filters.offset !== undefined) {
			params.append('offset', filters.offset.toString());
		}

		const queryString = params.toString();
		const url = `${API_URL}/receipt/history${
			queryString ? `?${queryString}` : ''
		}`;

		const response = await fetch(url, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			let errorMessage = "Erreur lors de la récupération de l'historique";
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;
			} catch {
				// Ignore parsing error
			}

			throw new Error(errorMessage);
		}

		const data = await response.json();
		return data.data || data;
	}

	/**
	 * Supprime un ticket et tous ses produits détectés
	 *
	 * @param receiptId - ID du ticket à supprimer
	 */
	async deleteReceipt(receiptId: string): Promise<void> {
		const response = await fetch(`${API_URL}/receipt/${receiptId}`, {
			method: 'DELETE',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			let errorMessage = 'Erreur lors de la suppression du ticket';
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;
			} catch {
				// Ignore parsing error
			}

			throw new Error(errorMessage);
		}
	}
}

// Export de l'instance singleton
export const receiptService = new ReceiptService();
