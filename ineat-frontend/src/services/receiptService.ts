/**
 * Service de gestion des tickets de caisse (receipts)
 * Gère l'upload, le traitement et la récupération des résultats
 */

// ===== TYPES =====

/**
 * Statut d'un ticket
 */
export type ReceiptStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'VALIDATED';

/**
 * Filtre de statut pour l'historique
 */
export type ReceiptStatusFilter = ReceiptStatus | 'ALL';

/**
 * Ordre de tri pour l'historique
 */
export type ReceiptSortOrder =
	| 'NEWEST'
	| 'OLDEST'
	| 'AMOUNT_HIGH'
	| 'AMOUNT_LOW';

/**
 * Métadonnées d'un ticket
 */
export interface ReceiptMetadata {
	id: string;
	userId: string;
	imageUrl: string;
	status: ReceiptStatus;
	totalAmount: number | null;
	purchaseDate: Date | null;
	storeName: string | null;
	storeLocation: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Item détecté sur un ticket
 */
export interface ReceiptItem {
	id: string;
	receiptId: string;
	productId: string | null;
	detectedName: string;
	quantity: number;
	unitPrice: number | null;
	totalPrice: number | null;
	confidence: number;
	validated: boolean;
	categoryGuess: string | null;
	expiryDate: Date | null;
	storageLocation: string | null;
	notes: string | null;
	createdAt: string;
}

/**
 * Données pour valider/modifier un item
 */
export interface ValidateReceiptItemData {
	productId?: string;
	detectedName?: string;
	quantity?: number;
	unitPrice?: number;
	totalPrice?: number;
	validated?: boolean;
	categoryGuess?: string | null;
	expiryDate?: Date | null;
	storageLocation?: string | null;
	notes?: string | null;
}

/**
 * Réponse de l'API pour l'upload
 */
export interface UploadReceiptResponse {
	success: boolean;
	data: {
		receiptId: string;
		status: ReceiptStatus;
		estimatedTime?: number;
	};
	message?: string;
}

/**
 * Données du statut en temps réel
 * Correspond au DTO retourné par le backend (ReceiptStatusDto)
 */
export interface ReceiptStatusData {
	id: string;
	status: ReceiptStatus;
	imageUrl: string | null;
	totalAmount: number | null;
	purchaseDate: string | null;
	merchantName: string | null;
	merchantAddress: string | null;
	totalItems: number;
	validatedItems: number;
	validationProgress: number;
	readyForInventory: boolean;
	addedToInventory: boolean;
	createdAt: string;
	updatedAt: string;
	estimatedTimeRemaining: number | null;
	errorMessage: string | null;
}

/**
 * Réponse pour le statut d'un ticket
 */
export interface ReceiptStatusResponse {
	success: boolean;
	data: ReceiptStatusData;
	message: string;
}

/**
 * Item de ticket détecté
 */
export interface ReceiptItem {
	id: string;
	productId?: string | null;
	detectedName: string;
	quantity: number;
	unitPrice?: number | null;
	totalPrice?: number | null;
	confidence: number;
	validated: boolean;
	categoryGuess?: string | null;
	expiryDate?: string | null;
	storageLocation?: string | null;
	notes?: string | null;
	createdAt: string;
	updatedAt: string;
	product?: {
		id: string;
		name: string;
		brand?: string | null;
		barcode?: string | null;
		unitType: UnitType;
		imageUrl?: string | null;
		nutriscore?: string | null;
		ecoScore?: string | null;
		category: {
			id: string;
			name: string;
			slug: string;
		};
	} | null;
}

/**
 * Métadonnées d'un ticket
 */
export interface ReceiptMetadata {
	id: string;
	status: ReceiptStatus;
	imageUrl: string;
	totalAmount?: number | null;
	purchaseDate?: string | null;
	merchantName?: string | null;
	merchantAddress?: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Statistiques de validation
 */
export interface ValidationStats {
	totalItems: number;
	validatedItems: number;
	validationProgress: number;
	itemsWithProducts: number;
	itemsNeedingNewProducts: number;
	averageConfidence: number;
	readyForInventory: boolean;
}

/**
 * Résultats complets d'un ticket
 */
export interface ReceiptResults {
	receipt: ReceiptMetadata;
	items: ReceiptItem[];
	stats: ValidationStats;
}

/**
 * Réponse pour les résultats d'un ticket
 */
export interface ReceiptResultsResponse {
	success: boolean;
	data: {
		receipt: ReceiptMetadata;
		items: ReceiptItem[];
	};
}

/**
 * Item de l'historique
 */
export interface ReceiptHistoryItem {
	id: string;
	imageUrl: string;
	status: ReceiptStatus;
	totalAmount: number | null;
	purchaseDate: Date | null;
	storeName: string | null;
	itemCount: number;
	validatedItemCount: number;
	createdAt: string;
	updatedAt: string;
}

/**
 * Statistiques de l'historique
 */
export interface ReceiptHistoryStats {
	totalReceipts: number;
	completedReceipts: number;
	totalItemsAdded: number;
	totalAmount: number;
}

/**
 * Filtres pour l'historique
 */
export interface ReceiptHistoryFilters {
	status?: ReceiptStatus;
	sortOrder?: ReceiptSortOrder;
	search?: string;
	startDate?: string;
	endDate?: string;
}

/**
 * Options pour l'ajout à l'inventaire
 */
export interface AddToInventoryOptions {
	purchaseDate?: string;
	autoCreateProducts?: boolean;
	forcedAdd?: boolean;
}

/**
 * Réponse de l'historique
 */
export interface ReceiptHistoryResponse {
	success: boolean;
	data: {
		receipts: ReceiptHistoryItem[];
		stats: ReceiptHistoryStats;
	};
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
	 * Upload un ticket de caisse pour traitement OCR
	 *
	 * @param file - Fichier image du ticket
	 * @returns Réponse avec le receiptId et le statut
	 * @throws Error si l'upload échoue
	 */
	async uploadReceipt(file: File): Promise<UploadReceiptResponse> {
		try {
			// Validation du fichier côté client
			const maxSize = 10 * 1024 * 1024; // 10MB
			if (file.size > maxSize) {
				throw new Error(
					'Le fichier est trop volumineux (maximum 10MB)'
				);
			}

			const allowedTypes = ['image/jpeg', 'image/png', 'image/heic'];
			if (!allowedTypes.includes(file.type)) {
				throw new Error(
					'Format de fichier non supporté (formats acceptés: JPEG, PNG, HEIC)'
				);
			}

			// Création du FormData
			// Format confirmé qui fonctionne : 'receipt_image' (snake_case)
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
							'❌ Erreur de configuration Cloudinary côté serveur.\n' +
								'Veuillez vérifier les credentials dans le .env backend.'
						);
					}
				} catch {
					// Si on ne peut pas parser le JSON, utiliser le message par défaut
				}

				throw new Error(errorMessage);
			}

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.message || "Échec de l'upload");
			}

			return {
				success: true,
				data: {
					receiptId: data.data.receiptId,
					status: data.data.status,
					estimatedTime: 30,
				},
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
	 * @param receiptId - ID du ticket
	 * @returns Statut actuel avec progression
	 */
	async getReceiptStatus(receiptId: string): Promise<ReceiptStatusData> {
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
		return data.data;
	}

	/**
	 * Récupère les résultats complets d'un ticket traité
	 *
	 * @param receiptId - ID du ticket
	 * @returns Métadonnées du ticket et liste des items détectés
	 */
	async getReceiptResults(
		receiptId: string
	): Promise<ReceiptResultsResponse> {
		const response = await fetch(
			`${API_URL}/receipt/${receiptId}/results`,
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

		return await response.json();
	}

	/**
	 * Met à jour un item du ticket (correction, validation, association produit)
	 *
	 * @param receiptId - ID du ticket
	 * @param itemId - ID de l'item à modifier
	 * @param data - Données à mettre à jour
	 */
	async updateReceiptItem(
		receiptId: string,
		itemId: string,
		data: ValidateReceiptItemData
	): Promise<void> {
		const response = await fetch(
			`${API_URL}/receipt/${receiptId}/items/${itemId}`,
			{
				method: 'PUT',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			}
		);

		if (!response.ok) {
			let errorMessage = "Erreur lors de la mise à jour de l'item";
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
	 * Ajoute tous les items validés d'un ticket à l'inventaire
	 *
	 * @param receiptId - ID du ticket
	 * @param options - Options d'ajout (optionnel)
	 */
	async addReceiptToInventory(
		receiptId: string,
		options: AddToInventoryOptions = {}
	): Promise<void> {
		// ✅ Ne PAS inclure receiptId dans le body (il est déjà dans l'URL)
		const hasOptions = Object.keys(options).length > 0;

		console.log('🚀 addReceiptToInventory called with:', {
			receiptId,
			options,
			hasOptions,
			bodyToSend: hasOptions ? options : 'NO BODY',
		});

		const fetchOptions: RequestInit = {
			method: 'POST',
			credentials: 'include',
		};

		// ✅ Ajouter body et Content-Type seulement si nécessaire
		if (hasOptions) {
			fetchOptions.headers = {
				'Content-Type': 'application/json',
			};
			fetchOptions.body = JSON.stringify(options);
		}

		const response = await fetch(
			`${API_URL}/receipt/${receiptId}/add-to-inventory`,
			fetchOptions
		);

		if (!response.ok) {
			let errorMessage =
				"Erreur lors de l'ajout des items à l'inventaire";
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
	 * Récupère l'historique des tickets avec filtres et statistiques
	 *
	 * @param filters - Filtres optionnels (statut, dates, recherche, tri)
	 * @returns Liste des tickets et statistiques globales
	 */
	async getReceiptHistory(
		filters: ReceiptHistoryFilters = {}
	): Promise<ReceiptHistoryResponse> {
		// Construction des query params
		const params = new URLSearchParams();

		if (filters.status) {
			params.append('status', filters.status);
		}
		if (filters.sortOrder) {
			params.append('sortOrder', filters.sortOrder);
		}
		if (filters.search) {
			params.append('search', filters.search);
		}
		if (filters.startDate) {
			params.append('startDate', filters.startDate);
		}
		if (filters.endDate) {
			params.append('endDate', filters.endDate);
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

		return await response.json();
	}

	/**
	 * Supprime un ticket et tous ses items
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
