import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { receiptService } from '@/services/receiptService';
import type {
	ReceiptAnalysis,
	DetectedProduct,
	ReceiptScanStatus,
	ProductStatus,
} from '@/schemas/receipt';
import {
	separateProductsByPhase,
	calculateSuccessRate,
} from '@/schemas/receipt';

// ===== TYPES =====

/**
 * État du store de scan de tickets
 */
interface ReceiptStoreState {
	// ===== État du scan =====
	status: ReceiptScanStatus;
	currentReceiptId: string | null;
	analysis: ReceiptAnalysis | null;
	error: string | null;

	// ===== Produits par phase =====
	phase1Products: DetectedProduct[];
	phase2Products: DetectedProduct[];

	// ===== Phase active =====
	currentPhase: 1 | 2;

	// ===== Statistiques =====
	validatedProductsCount: number;
	skippedProductsCount: number;

	// ===== Actions Upload & Analyse =====
	uploadReceipt: (file: File) => Promise<void>;
	pollAnalysis: (receiptId: string) => Promise<void>;
	setAnalysis: (analysis: ReceiptAnalysis) => void;
	setError: (error: string) => void;

	// ===== Actions Validation Produits =====
	selectEan: (productId: string, eanCode: string) => void;
	skipProduct: (productId: string) => void;
	updateProduct: (
		productId: string,
		updates: Partial<DetectedProduct>
	) => void;

	// ===== Actions Phase =====
	validatePhase1: () => void;
	goToPhase2: () => void;

	// ===== Actions Finales =====
	addToInventory: () => Promise<void>;

	// ===== Reset =====
	reset: () => void;
}

// ===== ÉTAT INITIAL =====

const initialState = {
	status: 'idle' as ReceiptScanStatus,
	currentReceiptId: null as string | null,
	analysis: null as ReceiptAnalysis | null,
	error: null as string | null,
	phase1Products: [] as DetectedProduct[],
	phase2Products: [] as DetectedProduct[],
	currentPhase: 1 as 1 | 2,
	validatedProductsCount: 0,
	skippedProductsCount: 0,
};

// ===== STORE =====

/**
 * Store Zustand pour la gestion des scans de tickets
 *
 * Workflow :
 * 1. Upload photo → status 'uploading'
 * 2. Polling analyse → status 'analyzing'
 * 3. Résultats disponibles → status 'results'
 * 4. Phase 1 : Validation produits bien identifiés
 * 5. Phase 2 : Gestion produits à problème
 * 6. Ajout à l'inventaire
 */
export const useReceiptStore = create<ReceiptStoreState>()(
	devtools(
		(set, get) => ({
			...initialState,

			// ===== UPLOAD & ANALYSE =====

			/**
			 * Upload un ticket et lance l'analyse
			 */
			uploadReceipt: async (file: File) => {
				try {
					console.log('🚀 [Store] uploadReceipt: starting upload...');
					set(
						{
							status: 'uploading',
							error: null,
							currentReceiptId: null,
						},
						false,
						'uploadReceipt/start'
					);

					// Upload
					const { receiptId } = await receiptService.uploadReceipt(
						file
					);
					console.log(
						'🚀 [Store] uploadReceipt: upload done, receiptId:',
						receiptId
					);

					// Stocker le receiptId immédiatement pour le loader
					set(
						{ status: 'analyzing', currentReceiptId: receiptId },
						false,
						'uploadReceipt/analyzing'
					);
					console.log(
						'🚀 [Store] uploadReceipt: status set to analyzing'
					);

					// Démarrer le polling
					await get().pollAnalysis(receiptId);
				} catch (error) {
					const errorMessage =
						error instanceof Error
							? error.message
							: "Erreur lors de l'upload du ticket";

					set(
						{ status: 'error', error: errorMessage },
						false,
						'uploadReceipt/error'
					);
					throw error;
				}
			},

			/**
			 * Polling du statut d'analyse jusqu'à complétion
			 */
			pollAnalysis: async (receiptId: string) => {
				const maxAttempts = 60; // 60 tentatives = 2 minutes max
				let attempts = 0;

				const poll = async (): Promise<void> => {
					try {
						attempts++;

						if (attempts > maxAttempts) {
							throw new Error(
								"L'analyse a pris trop de temps. Veuillez réessayer."
							);
						}

						const statusResponse =
							await receiptService.getReceiptStatus(receiptId);

						if (statusResponse.status === 'completed') {
							// Récupérer l'analyse complète
							const analysis =
								await receiptService.getReceiptAnalysis(
									receiptId
								);

							// Mettre à jour le status AVANT setAnalysis pour éviter race condition
							set(
								{ status: 'results' },
								false,
								'pollAnalysis/completed'
							);
							get().setAnalysis(analysis);
						} else if (statusResponse.status === 'error') {
							throw new Error(
								statusResponse.errorMessage ||
									"L'analyse du ticket a échoué"
							);
						} else {
							// Continuer le polling
							await new Promise((resolve) =>
								setTimeout(resolve, 2000)
							);
							await poll();
						}
					} catch (error) {
						const errorMessage =
							error instanceof Error
								? error.message
								: "Erreur lors de l'analyse du ticket";

						set(
							{ status: 'error', error: errorMessage },
							false,
							'pollAnalysis/error'
						);
						throw error;
					}
				};

				await poll();
			},

			/**
			 * Définit l'analyse et sépare les produits par phase
			 */
			setAnalysis: (analysis: ReceiptAnalysis) => {
				const { phase1, phase2 } = separateProductsByPhase(
					analysis.products
				);

				set(
					{
						analysis,
						phase1Products: phase1,
						phase2Products: phase2,
						currentPhase: 1,
						validatedProductsCount: 0,
						skippedProductsCount: 0,
					},
					false,
					'setAnalysis'
				);
			},

			/**
			 * Définit une erreur
			 */
			setError: (error: string) => {
				set({ status: 'error', error }, false, 'setError');
			},

			// ===== VALIDATION PRODUITS =====

			/**
			 * Sélectionne un code EAN pour un produit
			 */
			selectEan: (productId: string, eanCode: string) => {
				const state = get();
				const currentPhase = state.currentPhase;

				const updateProducts = (
					products: DetectedProduct[]
				): DetectedProduct[] =>
					products.map((product) =>
						product.id === productId
							? {
									...product,
									selectedEan: eanCode,
									status: 'validated' as ProductStatus,
							  }
							: product
					);

				if (currentPhase === 1) {
					const updated = updateProducts(state.phase1Products);
					const validatedCount = updated.filter(
						(p) => p.status === 'validated'
					).length;

					set(
						{
							phase1Products: updated,
							validatedProductsCount: validatedCount,
						},
						false,
						'selectEan/phase1'
					);
				} else {
					const updated = updateProducts(state.phase2Products);
					// Compter tous les validés (Phase 1 + Phase 2)
					const phase1Validated = state.phase1Products.filter(
						(p) => p.status === 'validated'
					).length;
					const phase2Validated = updated.filter(
						(p) => p.status === 'validated'
					).length;

					set(
						{
							phase2Products: updated,
							validatedProductsCount:
								phase1Validated + phase2Validated,
						},
						false,
						'selectEan/phase2'
					);
				}
			},

			/**
			 * Ignore un produit
			 */
			skipProduct: (productId: string) => {
				const state = get();
				const currentPhase = state.currentPhase;

				const updateProducts = (
					products: DetectedProduct[]
				): DetectedProduct[] =>
					products.map((product) =>
						product.id === productId
							? { ...product, status: 'skipped' as ProductStatus }
							: product
					);

				if (currentPhase === 1) {
					const updated = updateProducts(state.phase1Products);
					const skippedCount = updated.filter(
						(p) => p.status === 'skipped'
					).length;

					set(
						{
							phase1Products: updated,
							skippedProductsCount: skippedCount,
						},
						false,
						'skipProduct/phase1'
					);
				} else {
					const updated = updateProducts(state.phase2Products);
					// Compter tous les skippés (Phase 1 + Phase 2)
					const phase1Skipped = state.phase1Products.filter(
						(p) => p.status === 'skipped'
					).length;
					const phase2Skipped = updated.filter(
						(p) => p.status === 'skipped'
					).length;

					set(
						{
							phase2Products: updated,
							skippedProductsCount: phase1Skipped + phase2Skipped,
						},
						false,
						'skipProduct/phase2'
					);
				}
			},

			/**
			 * Met à jour un produit (utilisé après scan code-barres, recherche, etc.)
			 */
			updateProduct: (
				productId: string,
				updates: Partial<DetectedProduct>
			) => {
				const state = get();
				const currentPhase = state.currentPhase;

				const updateProducts = (
					products: DetectedProduct[]
				): DetectedProduct[] =>
					products.map((product) =>
						product.id === productId
							? { ...product, ...updates }
							: product
					);

				if (currentPhase === 1) {
					set(
						{
							phase1Products: updateProducts(
								state.phase1Products
							),
						},
						false,
						'updateProduct/phase1'
					);
				} else {
					set(
						{
							phase2Products: updateProducts(
								state.phase2Products
							),
						},
						false,
						'updateProduct/phase2'
					);
				}
			},

			// ===== GESTION PHASES =====

			/**
			 * Valide la Phase 1 et passe à la Phase 2
			 */
			validatePhase1: () => {
				const state = get();

				// Vérifier que tous les produits Phase 1 ont été traités
				const allHandled = state.phase1Products.every(
					(p) => p.status === 'validated' || p.status === 'skipped'
				);

				if (!allHandled) {
					throw new Error(
						'Tous les produits doivent être validés ou ignorés avant de passer à la Phase 2'
					);
				}

				// Passer à la Phase 2 (ou terminer si pas de produits Phase 2)
				set({ currentPhase: 2 }, false, 'validatePhase1');
			},

			/**
			 * Passe directement à la Phase 2
			 */
			goToPhase2: () => {
				set({ currentPhase: 2 }, false, 'goToPhase2');
			},

			// ===== AJOUT À L'INVENTAIRE =====

			/**
			 * Ajoute tous les produits validés à l'inventaire
			 */
			addToInventory: async () => {
				const state = get();
				const { analysis, phase1Products, phase2Products } = state;

				if (!analysis) {
					throw new Error('Aucune analyse disponible');
				}

				// Récupérer tous les produits validés (Phase 1 + Phase 2)
				const allProducts = [...phase1Products, ...phase2Products];
				const validatedProducts = allProducts.filter(
					(p) => p.status === 'validated' && p.selectedEan
				);

				if (validatedProducts.length === 0) {
					throw new Error("Aucun produit à ajouter à l'inventaire");
				}

				try {
					await receiptService.addToInventory({
						receiptId: analysis.receiptId,
						products: validatedProducts.map((p) => ({
							productId: p.id,
							eanCode: p.selectedEan || null,
							quantity: p.quantity || 1,
						})),
					});

					// Succès - reset du store
					get().reset();
				} catch (error) {
					const errorMessage =
						error instanceof Error
							? error.message
							: "Erreur lors de l'ajout à l'inventaire";

					set({ error: errorMessage }, false, 'addToInventory/error');
					throw error;
				}
			},

			// ===== RESET =====

			/**
			 * Réinitialise tout le store
			 */
			reset: () => {
				set(initialState, false, 'reset');
			},
		}),
		{
			name: 'ReceiptStore',
			enabled: import.meta.env.DEV,
		}
	)
);

// ===== SÉLECTEURS =====

/**
 * Sélecteurs optimisés pour éviter les re-renders inutiles
 */
export const receiptSelectors = {
	/**
	 * Statut du scan
	 */
	status: (state: ReceiptStoreState) => state.status,

	/**
	 * ID du ticket en cours de traitement
	 */
	currentReceiptId: (state: ReceiptStoreState) => state.currentReceiptId,

	/**
	 * Analyse complète
	 */
	analysis: (state: ReceiptStoreState) => state.analysis,

	/**
	 * Erreur éventuelle
	 */
	error: (state: ReceiptStoreState) => state.error,

	/**
	 * Produits Phase 1 (bien identifiés)
	 */
	phase1Products: (state: ReceiptStoreState) => state.phase1Products,

	/**
	 * Produits Phase 2 (problèmes)
	 */
	phase2Products: (state: ReceiptStoreState) => state.phase2Products,

	/**
	 * Phase actuelle (1 ou 2)
	 */
	currentPhase: (state: ReceiptStoreState) => state.currentPhase,

	/**
	 * Nombre de produits validés
	 */
	validatedCount: (state: ReceiptStoreState) => state.validatedProductsCount,

	/**
	 * Nombre de produits ignorés
	 */
	skippedCount: (state: ReceiptStoreState) => state.skippedProductsCount,

	/**
	 * Vérifie si un scan est en cours
	 */
	isScanning: (state: ReceiptStoreState) =>
		state.status === 'uploading' || state.status === 'analyzing',

	/**
	 * Vérifie si les résultats sont disponibles
	 */
	hasResults: (state: ReceiptStoreState) =>
		state.status === 'results' && state.analysis !== null,

	/**
	 * Vérifie si une erreur est présente
	 */
	hasError: (state: ReceiptStoreState) =>
		state.status === 'error' && state.error !== null,

	/**
	 * Taux de succès de l'analyse (%)
	 */
	successRate: (state: ReceiptStoreState) =>
		state.analysis ? calculateSuccessRate(state.analysis) : 0,

	/**
	 * Tous les produits validés (Phase 1 + Phase 2)
	 */
	allValidatedProducts: (state: ReceiptStoreState) =>
		[...state.phase1Products, ...state.phase2Products].filter(
			(p) => p.status === 'validated'
		),

	/**
	 * Vérifie si Phase 1 est complète
	 */
	isPhase1Complete: (state: ReceiptStoreState) =>
		state.phase1Products.every(
			(p) => p.status === 'validated' || p.status === 'skipped'
		),

	/**
	 * Vérifie si on peut ajouter à l'inventaire
	 */
	canAddToInventory: (state: ReceiptStoreState) => {
		const allProducts = [...state.phase1Products, ...state.phase2Products];
		const hasValidated = allProducts.some((p) => p.status === 'validated');
		const phase1Complete = state.phase1Products.every(
			(p) => p.status === 'validated' || p.status === 'skipped'
		);

		return hasValidated && phase1Complete;
	},
};

// ===== HOOKS PERSONNALISÉS =====

/**
 * Hook pour récupérer un produit par ID
 */
export const useProduct = (productId: string): DetectedProduct | undefined => {
	return useReceiptStore((state) => {
		const allProducts = [...state.phase1Products, ...state.phase2Products];
		return allProducts.find((p) => p.id === productId);
	});
};

/**
 * Hook pour les statistiques du scan
 */
export const useScanStatistics = () => {
	return useReceiptStore((state) => ({
		totalProducts: state.analysis?.products.length || 0,
		phase1Count: state.phase1Products.length,
		phase2Count: state.phase2Products.length,
		validatedCount: state.validatedProductsCount,
		skippedCount: state.skippedProductsCount,
		successRate: state.analysis ? calculateSuccessRate(state.analysis) : 0,
	}));
};

// Export du type pour utilisation externe
export type { ReceiptStoreState };
