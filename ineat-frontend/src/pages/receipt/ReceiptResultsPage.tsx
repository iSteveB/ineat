import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	ArrowLeft,
	Loader2,
	AlertTriangle,
	CheckCircle2,
	ShoppingCart,
} from 'lucide-react';
import { ReceiptSummary } from '@/features/receipt/ReceiptSummary';
import { ReceiptItemsList } from '@/features/receipt/ReceiptItemsList';
import { EditReceiptItemModal } from '@/features/receipt/EditReceiptItemModal';
import { ProductSearchModal } from '@/features/receipt/ProductSearchModal';
import { receiptService } from '@/services/receiptService';
import { useReceiptStore } from '@/stores/receiptStore';
import type {
	ReceiptItem,
	ReceiptMetadata,
	ValidateReceiptItemData,
} from '@/services/receiptService';
import type { Product } from '@/schemas/product';
import type { EditFormData } from '@/features/receipt/EditReceiptItemModal';
import { inventoryService } from '@/services/inventoryService';

// ===== TYPES =====

/**
 * État de la page
 */
interface PageState {
	receipt: ReceiptMetadata | null;
	items: ReceiptItem[];
	isLoading: boolean;
	isSaving: boolean;
	error: string | null;
}

/**
 * État des modals
 */
interface ModalsState {
	editItem: ReceiptItem | null;
	searchItem: ReceiptItem | null;
}

// ===== COMPOSANT =====

/**
 * Page des résultats d'un ticket scanné
 * 
 * Fonctionnalités :
 * - Affichage du résumé du ticket
 * - Liste des items détectés avec filtres
 * - Édition des items
 * - Association de produits
 * - Validation et ajout à l'inventaire
 * - Gestion des erreurs
 * 
 * @example
 * Route: /app/receipts/:receiptId/results
 */
export const ReceiptResultsPage: React.FC = () => {
	// ===== NAVIGATION =====

	const navigate = useNavigate();
	const { receiptId } = useParams({ strict: false }) as { receiptId: string };

	// ===== STORE =====

	const clearActiveReceipt = useReceiptStore((state) => state.clearActiveReceipt);

	// ===== STATE =====

	const [pageState, setPageState] = useState<PageState>({
		receipt: null,
		items: [],
		isLoading: true,
		isSaving: false,
		error: null,
	});

	const [modalsState, setModalsState] = useState<ModalsState>({
		editItem: null,
		searchItem: null,
	});

	// ===== CHARGEMENT DES DONNÉES =====

	/**
	 * Charge les données complètes du ticket
	 */
	const loadReceiptData = useCallback(async () => {
		setPageState((prev) => ({ ...prev, isLoading: true, error: null }));

		try {
			const response = await receiptService.getReceiptResults(receiptId);

			setPageState({
				receipt: response.data.receipt,
				items: response.data.items,
				isLoading: false,
				isSaving: false,
				error: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Erreur lors du chargement des données';

			setPageState((prev) => ({
				...prev,
				isLoading: false,
				error: errorMessage,
			}));

			toast.error(errorMessage);
		}
	}, [receiptId]);

	// ===== EFFETS =====

	/**
	 * Charge les données du ticket au montage
	 */
	useEffect(() => {
		if (receiptId) {
			loadReceiptData();
		}
	}, [receiptId, loadReceiptData]);

	/**
	 * Cleanup au démontage
	 */
	useEffect(() => {
		return () => {
			clearActiveReceipt();
		};
	}, [clearActiveReceipt]);

	// ===== HANDLERS - ITEMS =====

	/**
	 * Ouvre le modal d'édition pour un item
	 */
	const handleEditItem = useCallback((item: ReceiptItem) => {
		setModalsState((prev) => ({ ...prev, editItem: item }));
	}, []);

	/**
	 * Sauvegarde les modifications d'un item
	 */
	const handleSaveItem = useCallback(
		async (itemId: string, data: Partial<EditFormData>) => {
			try {
				// Convertir EditFormData en ValidateReceiptItemData
				const updateData: ValidateReceiptItemData = {
					detectedName: data.detectedName,
					quantity: data.quantity,
					unitPrice: data.unitPrice ?? undefined,
					totalPrice: data.totalPrice ?? undefined,
					categoryGuess: data.categoryGuess,
					expiryDate: data.expiryDate,
					storageLocation: data.storageLocation,
					notes: data.notes,
				};

				await receiptService.updateReceiptItem(receiptId, itemId, updateData);

				// Recharger les données
				await loadReceiptData();

				toast.success('Article modifié avec succès');
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: 'Erreur lors de la modification';
				throw new Error(errorMessage);
			}
		},
		[receiptId, loadReceiptData]
	);

	/**
	 * Toggle la validation d'un item
	 */
	const handleToggleValidation = useCallback(
		async (itemId: string, validated: boolean) => {
			try {
				await receiptService.updateReceiptItem(receiptId, itemId, { validated });

				// Mettre à jour localement
				setPageState((prev) => ({
					...prev,
					items: prev.items.map((item) =>
						item.id === itemId ? { ...item, validated } : item
					),
				}));

				toast.success(validated ? 'Article validé' : 'Validation annulée');
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: 'Erreur lors de la validation';
				toast.error(errorMessage);
			}
		},
		[receiptId]
	);

	// ===== HANDLERS - PRODUITS =====

	/**
	 * Associe un produit à un item
	 */
	const handleSelectProduct = useCallback(
		async (itemId: string, product: Product) => {
			try {
				await receiptService.updateReceiptItem(receiptId, itemId, {
					productId: product.id,
				});

				// Recharger les données
				await loadReceiptData();

				toast.success('Produit associé avec succès');
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Erreur lors de l'association";
				throw new Error(errorMessage);
			}
		},
		[receiptId, loadReceiptData]
	);

	/**
	 * Recherche des produits (pour le modal)
	 */
	const handleSearchProducts = useCallback(async (query: string): Promise<Product[]> => {
		try {
			// Utiliser inventoryService pour rechercher les produits
			const results = await inventoryService.searchProducts(query, 10, false);
			
			// Convertir ProductSearchResult en Product
			return results.map((result) => ({
				id: result.id,
				name: result.name,
				brand: result.brand,
				barcode: result.barcode,
				category: result.category,
				unitType: result.unitType,
				nutriscore: result.nutriscore,
				ecoscore: result.ecoscore,
				novascore: result.novascore,
				imageUrl: result.imageUrl,
				ingredients: result.ingredients,
				nutrients: result.nutrients,
				createdAt: new Date().toISOString(), // Placeholder
				updatedAt: new Date().toISOString(), // Placeholder
			}));
		} catch {
			throw new Error('Erreur lors de la recherche');
		}
	}, []);

	// ===== HANDLERS - INVENTAIRE =====

	/**
	 * Ajoute tous les items validés à l'inventaire
	 */
	const handleAddToInventory = useCallback(async () => {
		if (!pageState.receipt) return;

		// Vérifier qu'il y a des items validés
		const validatedItems = pageState.items.filter((item) => item.validated);

		if (validatedItems.length === 0) {
			toast.error('Veuillez valider au moins un article');
			return;
		}

		setPageState((prev) => ({ ...prev, isSaving: true }));

		try {
			await receiptService.addReceiptToInventory(receiptId);

			toast.success('Articles ajoutés à l\'inventaire avec succès !');

			// Rediriger vers l'inventaire après un court délai
			setTimeout(() => {
				navigate({ to: '/app/inventory' });
			}, 1500);
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Erreur lors de l'ajout à l'inventaire";

			toast.error(errorMessage);

			setPageState((prev) => ({ ...prev, isSaving: false }));
		}
	}, [receiptId, pageState.receipt, pageState.items, navigate]);

	// ===== HANDLERS - MODALS =====

	/**
	 * Ferme le modal d'édition
	 */
	const handleCloseEditModal = useCallback(() => {
		setModalsState((prev) => ({ ...prev, editItem: null }));
	}, []);

	/**
	 * Ferme le modal de recherche
	 */
	const handleCloseSearchModal = useCallback(() => {
		setModalsState((prev) => ({ ...prev, searchItem: null }));
	}, []);

	// ===== CALCULS =====

	/**
	 * Calcule les statistiques
	 */
	const stats = {
		total: pageState.items.length,
		validated: pageState.items.filter((item) => item.validated).length,
		progress:
			pageState.items.length > 0
				? Math.round(
						(pageState.items.filter((item) => item.validated).length /
							pageState.items.length) *
							100
				  )
				: 0,
		readyForInventory:
			pageState.items.length > 0 &&
			pageState.items.every((item) => item.validated),
	};

	// ===== RENDU DES SECTIONS =====

	/**
	 * Rendu de l'en-tête
	 */
	const renderHeader = () => (
		<div className="flex items-center justify-between mb-6">
			<div className="flex items-center gap-3">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: '/app/inventory' })}
					className="p-2"
					disabled={pageState.isSaving}
				>
					<ArrowLeft className="size-4" />
				</Button>
				<div>
					<h1 className="text-2xl font-bold">Résultats du scan</h1>
					<p className="text-sm text-muted-foreground">
						Vérifiez et validez les articles détectés
					</p>
				</div>
			</div>
		</div>
	);

	/**
	 * Rendu du bouton d'ajout à l'inventaire
	 */
	const renderAddToInventoryButton = () => {
		const hasValidatedItems = stats.validated > 0;

		return (
			<div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t p-4 -mx-4">
				<div className="container max-w-4xl mx-auto">
					<Button
						size="lg"
						className="w-full"
						onClick={handleAddToInventory}
						disabled={!hasValidatedItems || pageState.isSaving}
					>
						{pageState.isSaving ? (
							<>
								<Loader2 className="size-5 mr-2 animate-spin" />
								Ajout en cours...
							</>
						) : (
							<>
								<ShoppingCart className="size-5 mr-2" />
								Ajouter {stats.validated} article{stats.validated > 1 ? 's' : ''} à
								l'inventaire
							</>
						)}
					</Button>

					{!hasValidatedItems && (
						<p className="text-center text-sm text-muted-foreground mt-2">
							Validez au moins un article pour continuer
						</p>
					)}
				</div>
			</div>
		);
	};

	// ===== RENDU PRINCIPAL =====

	// Loading
	if (pageState.isLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					<div className="flex items-center justify-center py-12">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				</div>
			</div>
		);
	}

	// Erreur
	if (pageState.error || !pageState.receipt) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					{renderHeader()}

					<Alert variant="destructive">
						<AlertTriangle className="size-4" />
						<AlertDescription>
							{pageState.error || 'Ticket introuvable'}
						</AlertDescription>
					</Alert>

					<div className="mt-4">
						<Button
							variant="outline"
							onClick={() => navigate({ to: '/app/inventory' })}
						>
							Retour à l'inventaire
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8 pb-24">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Header */}
				{renderHeader()}

				{/* Message de succès si tous validés */}
				{stats.readyForInventory && (
					<Alert className="border-green-500 bg-green-50">
						<CheckCircle2 className="size-4 text-green-600" />
						<AlertDescription className="text-green-800">
							Tous les articles sont validés ! Vous pouvez les ajouter à votre
							inventaire.
						</AlertDescription>
					</Alert>
				)}

				{/* Résumé du ticket */}
				<ReceiptSummary
					receipt={pageState.receipt}
					totalItems={stats.total}
					validatedItems={stats.validated}
					validationProgress={stats.progress}
					readyForInventory={stats.readyForInventory}
				/>

				{/* Liste des items */}
				<ReceiptItemsList
					items={pageState.items}
					onEditItem={handleEditItem}
					onToggleValidation={handleToggleValidation}
					disabled={pageState.isSaving}
					showFilters={true}
				/>

				{/* Bouton d'ajout à l'inventaire */}
				{renderAddToInventoryButton()}
			</div>

			{/* Modal d'édition */}
			<EditReceiptItemModal
				item={modalsState.editItem}
				open={modalsState.editItem !== null}
				onClose={handleCloseEditModal}
				onSave={handleSaveItem}
			/>

			{/* Modal de recherche de produit */}
			<ProductSearchModal
				itemName={modalsState.searchItem?.detectedName || ''}
				itemId={modalsState.searchItem?.id || ''}
				open={modalsState.searchItem !== null}
				onClose={handleCloseSearchModal}
				onSelectProduct={handleSelectProduct}
				searchProducts={handleSearchProducts}
			/>
		</div>
	);
};

export default ReceiptResultsPage;