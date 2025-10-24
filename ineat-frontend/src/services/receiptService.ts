import { apiClient } from '../lib/api-client';

// ===== TYPES POUR LES TICKETS =====

/**
 * Statut d'un ticket de caisse
 */
export type ReceiptStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'VALIDATED';

/**
 * Ordre de tri pour l'historique
 */
export type ReceiptSortOrder =
	| 'NEWEST'
	| 'OLDEST'
	| 'AMOUNT_HIGH'
	| 'AMOUNT_LOW';

/**
 * Filtre de statut pour l'historique
 */
export type ReceiptStatusFilter =
	| 'ALL'
	| 'PROCESSING'
	| 'COMPLETED'
	| 'FAILED'
	| 'VALIDATED';

/**
 * Type d'unité pour les produits
 */
export type UnitType = 'KG' | 'G' | 'L' | 'ML' | 'UNIT';

// ===== INTERFACES POUR LES RÉPONSES API =====

/**
 * Réponse après upload d'un ticket
 */
export interface ReceiptUploadResponse {
	success: boolean;
	data: {
		receiptId: string;
		status: ReceiptStatus;
		estimatedTime: number;
	};
	message: string;
}

/**
 * Informations de statut d'un ticket
 */
export interface ReceiptStatusData {
	id: string;
	status: ReceiptStatus;
	imageUrl: string;
	totalAmount?: number | null;
	purchaseDate?: string | null;
	storeName?: string | null;
	storeLocation?: string | null;
	totalItems: number;
	validatedItems: number;
	validationProgress: number;
	readyForInventory: boolean;
	addedToInventory: boolean;
	createdAt: string;
	updatedAt: string;
	estimatedTimeRemaining?: number | null;
	errorMessage?: string | null;
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
	storeName?: string | null;
	storeLocation?: string | null;
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
	data: ReceiptResults;
	message: string;
}

/**
 * Item dans l'historique
 */
export interface ReceiptHistoryItem {
	id: string;
	status: ReceiptStatus;
	imageUrl: string;
	totalAmount?: number | null;
	purchaseDate?: string | null;
	storeName?: string | null;
	storeLocation?: string | null;
	totalItems: number;
	validatedItems: number;
	validationProgress: number;
	addedToInventory: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * Métadonnées de pagination
 */
export interface PaginationMeta {
	currentPage: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
}

/**
 * Statistiques de l'historique
 */
export interface ReceiptHistoryStats {
	totalReceipts: number;
	completedReceipts: number;
	pendingValidation: number;
	failedReceipts: number;
	totalAmount: number;
	averageAmount: number;
	totalItemsAdded: number;
	firstReceiptDate?: string | null;
	lastReceiptDate?: string | null;
}

/**
 * Historique complet des tickets
 */
export interface ReceiptHistory {
	receipts: ReceiptHistoryItem[];
	pagination: PaginationMeta;
	stats: ReceiptHistoryStats;
}

/**
 * Réponse pour l'historique des tickets
 */
export interface ReceiptHistoryResponse {
	success: boolean;
	data: ReceiptHistory;
	message: string;
}

// ===== INTERFACES POUR LES REQUÊTES =====

/**
 * Données pour valider un item de ticket
 */
export interface ValidateReceiptItemData {
	productId?: string;
	newProduct?: {
		name: string;
		brand?: string;
		barcode?: string;
		categorySlug: string;
		imageUrl?: string;
		unitType: UnitType;
	};
	detectedName?: string;
	quantity?: number;
	unitPrice?: number;
	totalPrice?: number;
	validated?: boolean;
	confidence?: number;
	categoryGuess?: string;
	expiryDate?: string;
	storageLocation?: string;
	notes?: string;
}

/**
 * Options pour l'ajout à l'inventaire
 */
export interface AddReceiptToInventoryOptions {
	purchaseDate?: string;
	autoCreateProducts?: boolean;
	forcedAdd?: boolean;
}

/**
 * Résultat de l'ajout à l'inventaire
 */
export interface ReceiptToInventoryResult {
	addedItems: Array<{
		id: string;
		productName: string;
		quantity: number;
		totalPrice?: number;
	}>;
	failedItems: Array<{
		productName: string;
		error: string;
	}>;
	budgetImpact: {
		totalAmount: number;
		expenseCreated: boolean;
		budgetId?: string;
		remainingBudget?: number;
		warningMessage?: string;
	};
	summary: {
		totalItemsProcessed: number;
		successfulItems: number;
		failedItems: number;
		totalAmountSpent: number;
	};
}

/**
 * Réponse pour l'ajout à l'inventaire
 */
export interface AddReceiptToInventoryResponse {
	success: boolean;
	data: ReceiptToInventoryResult;
	message: string;
}

/**
 * Filtres pour l'historique
 */
export interface ReceiptHistoryFilters {
	page?: number;
	limit?: number;
	status?: ReceiptStatusFilter;
	sortOrder?: ReceiptSortOrder;
	search?: string;
	startDate?: string;
	endDate?: string;
}

// ===== SERVICE PRINCIPAL =====

/**
 * Service pour gérer les tickets de caisse
 * Centralise tous les appels API liés aux tickets
 */
export const receiptService = {
	/**
	 * Upload un fichier de ticket de caisse
	 */
	async uploadReceipt(file: File): Promise<ReceiptUploadResponse> {
		// Validation du fichier côté client
		if (!file) {
			throw new Error('Aucun fichier sélectionné');
		}

		// Vérifier le type de fichier
		if (!file.type.startsWith('image/')) {
			throw new Error('Le fichier doit être une image');
		}

		// Vérifier la taille (max 10MB)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			throw new Error("L'image ne doit pas dépasser 10MB");
		}

		// Créer FormData pour l'upload
		const formData = new FormData();
		formData.append('image', file);

		try {
			// Note : apiClient gère automatiquement le Content-Type pour FormData
			const response = await fetch('/api/receipt/upload', {
				method: 'POST',
				credentials: 'include',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				throw new Error(
					errorData?.message || "Erreur lors de l'upload"
				);
			}

			return await response.json();
		} catch (error) {
			console.error('Erreur upload ticket:', error);
			throw error;
		}
	},

	/**
	 * Récupère le statut d'un ticket
	 */
	async getReceiptStatus(receiptId: string): Promise<ReceiptStatusResponse> {
		return await apiClient.get<ReceiptStatusResponse>(
			`/receipt/${receiptId}/status`
		);
	},

	/**
	 * Récupère les résultats détaillés d'un ticket
	 */
	async getReceiptResults(
		receiptId: string
	): Promise<ReceiptResultsResponse> {
		return await apiClient.get<ReceiptResultsResponse>(
			`/receipt/${receiptId}/results`
		);
	},

	/**
	 * Met à jour un item de ticket (validation/correction)
	 */
	async updateReceiptItem(
		receiptId: string,
		itemId: string,
		data: ValidateReceiptItemData
	): Promise<{ success: boolean; data: ReceiptItem; message: string }> {
		return await apiClient.put<{
			success: boolean;
			data: ReceiptItem;
			message: string;
		}>(`/receipt/${receiptId}/items/${itemId}`, data);
	},

	/**
	 * Ajoute un ticket validé à l'inventaire
	 */
	async addReceiptToInventory(
		receiptId: string,
		options: AddReceiptToInventoryOptions = {}
	): Promise<AddReceiptToInventoryResponse> {
		return await apiClient.post<AddReceiptToInventoryResponse>(
			`/receipt/${receiptId}/add-to-inventory`,
			options
		);
	},

	/**
	 * Récupère l'historique des tickets avec filtres
	 */
	async getReceiptHistory(
		filters: ReceiptHistoryFilters = {}
	): Promise<ReceiptHistoryResponse> {
		// Construire les paramètres de query
		const searchParams = new URLSearchParams();

		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				searchParams.append(key, value.toString());
			}
		});

		const queryString = searchParams.toString();
		const endpoint = queryString
			? `/receipt/history?${queryString}`
			: '/receipt/history';

		return await apiClient.get<ReceiptHistoryResponse>(endpoint);
	},

	/**
	 * Supprime un ticket
	 *
	 * Supprime le ticket de la base de données et le fichier associé de Cloudinary.
	 * Cette action est irréversible.
	 *
	 * Note: Ne peut supprimer que les tickets qui n'ont pas été ajoutés à l'inventaire
	 *
	 * @param receiptId - ID du ticket à supprimer
	 * @returns Confirmation de suppression
	 * @throws Error si le ticket n'existe pas ou appartient à un autre utilisateur
	 */
	async deleteReceipt(
		receiptId: string
	): Promise<{ success: boolean; message: string }> {
		return await apiClient.delete<{ success: boolean; message: string }>(
			`/receipt/${receiptId}`
		);
	},

	/**
	 * Utilitaire : Vérifie si un ticket est prêt pour l'ajout à l'inventaire
	 */
	isReadyForInventory(status: ReceiptStatusData): boolean {
		return status.readyForInventory && status.status === 'VALIDATED';
	},

	/**
	 * Utilitaire : Obtient le message d'état approprié
	 */
	getStatusMessage(status: ReceiptStatusData): string {
		switch (status.status) {
			case 'PROCESSING': {
				const timeLeft = status.estimatedTimeRemaining;
				return timeLeft
					? `Traitement en cours... (~${timeLeft}s restantes)`
					: 'Traitement en cours...';
			}

			case 'COMPLETED':
				return "Ticket traité et ajouté à l'inventaire";

			case 'FAILED':
				return status.errorMessage || 'Erreur lors du traitement';

			case 'VALIDATED':
				if (status.readyForInventory) {
					return "Prêt à être ajouté à l'inventaire";
				} else {
					return `Validation en cours (${status.validatedItems}/${status.totalItems} items)`;
				}

			default:
				return 'Statut inconnu';
		}
	},

	/**
	 * Utilitaire : Formate le montant pour l'affichage
	 */
	formatAmount(amount?: number | null): string {
		if (!amount) return 'N/A';
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount);
	},

	/**
	 * Utilitaire : Formate la date relative
	 */
	formatRelativeDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return "Aujourd'hui";
		} else if (diffDays === 1) {
			return 'Hier';
		} else if (diffDays < 7) {
			return `Il y a ${diffDays} jours`;
		} else {
			return date.toLocaleDateString('fr-FR');
		}
	},
};

export default receiptService;
