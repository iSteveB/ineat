import React, { useState, useCallback } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
	Package,
	Scan,
	Plus,
	ArrowLeft,
	AlertTriangle,
	CheckCircle2,
	ExternalLink,
} from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import { QuickAddForm } from '@/features/inventory/components/QuickAddForm';
import { Product } from '@/schemas/product';
import { AddInventoryItemData } from '@/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	inventoryService,
	ProductSearchResult,
	QuickAddFormDataWithCategory,
} from '@/services/inventoryService';

/**
 * Étapes du flow de scan
 */
type FlowStep = 'scan' | 'form' | 'success' | 'not-found';

/**
 * Données du produit en cours d'ajout
 */
interface ProductDraft {
	scannedBarcode?: string;
	offData?: Partial<Product>;
	productSearchResult?: ProductSearchResult;
}

/**
 * Props du composant ProductScanFlow
 */
interface ProductScanFlowProps {
	onComplete?: () => void;
	onCancel?: () => void;
	defaultStep?: FlowStep;
	className?: string;
}

/**
 * Composant d'intégration complète du flow de scan
 *
 * Orchestration complète :
 * 1. Scanner de code-barre (ou saisie manuelle)
 * 2. Recherche OpenFoodFacts automatique
 * 3. Pré-remplissage QuickAddForm avec données OFF
 * 4. L'utilisateur complète : catégorie, prix, lieu, date péremption
 * 5. Ajout à l'inventaire via addManualProduct (nouveau produit)
 * 6. Gestion produits non trouvés → création manuelle
 */
export const ProductScanFlow: React.FC<ProductScanFlowProps> = ({
	onComplete,
	onCancel,
	defaultStep = 'scan',
	className = '',
}) => {
	const router = useRouter();
	const queryClient = useQueryClient();

	// États locaux
	const [currentStep, setCurrentStep] = useState<FlowStep>(defaultStep);
	const [productDraft, setProductDraft] = useState<ProductDraft>({});
	const [error, setError] = useState<string | null>(null);

	// Mutation pour addManualProduct (création nouveau produit)
	const addManualProductMutation = useMutation({
		mutationFn: inventoryService.addManualProduct,
		onSuccess: (result) => {
			// Afficher la notification selon le type
			switch (result.type) {
				case 'success':
					toast.success(result.message);
					break;
				case 'info':
					toast.info(result.message, {
						description: result.budgetInfo.expenseCreated
							? `Dépense ajoutée au budget`
							: 'Prix non renseigné - aucune dépense créée',
					});
					break;
				case 'warning':
					toast.warning(result.message, {
						description: 'Attention à votre budget !',
					});
					break;
			}

			// Rafraîchir les données
			queryClient.invalidateQueries({ queryKey: ['inventory'] });
			if (result.shouldRefreshBudget) {
				queryClient.invalidateQueries({ queryKey: ['budget'] });
			}
		},
		onError: (error: Error) => {
			toast.error("Erreur lors de l'ajout", {
				description: error.message,
			});
		},
	});

	/**
	 * Gère la détection d'un produit via scan/saisie
	 */
	const handleProductFound = useCallback((localProduct: Partial<Product>) => {
		// Convertir les données OFF en ProductSearchResult pour le QuickAddForm
		const productSearchResult: ProductSearchResult = {
			id: crypto.randomUUID(),
			name: localProduct.name || 'Produit sans nom',
			brand: localProduct.brand || undefined,
			category: {
				id: 'temp-category',
				name: 'À définir',
				slug: 'a-definir',
			},
			unitType: 'UNIT',
			imageUrl: undefined,
			nutriscore: undefined,
			ecoScore: undefined,
		};

		setProductDraft((prev) => ({
			...prev,
			offData: localProduct,
			productSearchResult,
		}));

		setCurrentStep('form');
		setError(null);
	}, []);

	/**
	 * Gère les produits non trouvés dans OFF
	 */
	const handleProductNotFound = useCallback((barcode: string) => {
		setProductDraft((prev) => ({
			...prev,
			scannedBarcode: barcode,
			offData: undefined,
			productSearchResult: undefined,
		}));

		setCurrentStep('not-found');
		setError(null);
	}, []);

	/**
	 * Gère les erreurs de scan/recherche
	 */
	const handleScanError = useCallback((errorMessage: string) => {
		setError(errorMessage);
	}, []);

	/**
	 * Gère la soumission du formulaire QuickAdd
	 * Convertit QuickAddFormDataWithCategory vers AddInventoryItemData
	 * et utilise addManualProduct pour créer un nouveau produit
	 */
	const handleFormSubmit = useCallback(
		async (formData: QuickAddFormDataWithCategory) => {
			try {
				setError(null);

				// Convertir QuickAddFormDataWithCategory vers AddInventoryItemData
				const addInventoryData: AddInventoryItemData = {
					name:
						productDraft.productSearchResult?.name ||
						'Produit sans nom',
					brand: productDraft.productSearchResult?.brand || undefined,
					category: formData.category, // Utiliser la catégorie du formulaire
					quantity: formData.quantity,
					unitType:
						productDraft.productSearchResult?.unitType || 'UNIT',
					purchaseDate: formData.purchaseDate,
					expiryDate: formData.expiryDate,
					purchasePrice: formData.purchasePrice,
					storageLocation: formData.storageLocation,
					notes: formData.notes,
					barcode: productDraft.scannedBarcode,
				};

				console.log(
					'ProductScanFlow - Données envoyées:',
					addInventoryData
				);

				// Utiliser addManualProduct pour créer un nouveau produit
				await addManualProductMutation.mutateAsync(addInventoryData);

				setCurrentStep('success');

				// Callback de succès après un délai
				setTimeout(() => {
					onComplete?.();
				}, 1500);
			} catch (err: unknown) {
				console.error('Erreur ajout produit:', err);
				setError(
					err instanceof Error
						? err.message
						: "Erreur lors de l'ajout du produit"
				);
			}
		},
		[addManualProductMutation, onComplete, productDraft]
	);

	/**
	 * Retourne au scan
	 */
	const handleBackToScan = useCallback(() => {
		setCurrentStep('scan');
		setProductDraft({});
		setError(null);
	}, []);

	/**
	 * Redirige vers la création manuelle complète
	 */
	const handleCreateManually = useCallback(() => {
		const barcode = productDraft.scannedBarcode;
		const search = barcode ? `?barcode=${barcode}` : '';
		router.navigate({ to: `/products/create${search}` });
	}, [router, productDraft.scannedBarcode]);

	/**
	 * Rendu selon l'étape actuelle
	 */
	const renderStep = (): React.ReactNode => {
		switch (currentStep) {
			case 'scan':
				return (
					<div className='size-full'>
						<BarcodeScanner
							onProductFound={handleProductFound}
							onProductNotFound={handleProductNotFound}
							onError={handleScanError}
							onClose={onCancel}
							autoStart={true}
							className='size-full'
						/>
					</div>
				);

			case 'form':
				return (
					<div className='p-6 space-y-6'>
						{/* Header */}
						<div className='flex items-center justify-between'>
							<div className='flex items-center space-x-3'>
								<button
									onClick={handleBackToScan}
									className='p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors'>
									<ArrowLeft className='size-5 text-gray-600' />
								</button>
								<div>
									<h2 className='text-xl font-semibold text-gray-900'>
										Ajouter le produit
									</h2>
									<p className='text-sm text-gray-600'>
										Complétez les informations
									</p>
								</div>
							</div>
							<Package className='size-8 text-blue-600' />
						</div>

						{/* Infos du produit trouvé */}
						{productDraft.offData && (
							<div className='bg-green-50 border border-green-200 rounded-lg p-4'>
								<div className='flex items-center space-x-2 mb-2'>
									<CheckCircle2 className='size-5 text-green-600' />
									<span className='font-medium text-green-800'>
										Produit trouvé dans OpenFoodFacts
									</span>
								</div>
								<div className='text-sm text-green-700'>
									<p>
										<strong>Nom :</strong>{' '}
										{productDraft.offData.name}
									</p>
									<p>
										<strong>Marque :</strong>{' '}
										{productDraft.offData.brand}
									</p>
								</div>
							</div>
						)}

						{/* Formulaire d'ajout rapide */}
						{productDraft.productSearchResult && (
							<QuickAddForm
								product={productDraft.productSearchResult}
								onSubmit={handleFormSubmit}
								onCancel={handleBackToScan}
								isSubmitting={
									addManualProductMutation.isPending
								}
							/>
						)}

						{/* Erreur */}
						{(error || addManualProductMutation.error) && (
							<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
								<div className='flex items-center space-x-2'>
									<AlertTriangle className='size-5 text-red-600' />
									<span className='text-sm text-red-800'>
										{error ||
											addManualProductMutation.error
												?.message}
									</span>
								</div>
							</div>
						)}
					</div>
				);

			case 'not-found':
				return (
					<div className='p-6 text-center space-y-6'>
						{/* Header */}
						<div className='flex items-center justify-center space-x-3 mb-6'>
							<button
								onClick={handleBackToScan}
								className='absolute left-6 top-6 p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors'>
								<ArrowLeft className='size-5 text-gray-600' />
							</button>
						</div>

						{/* Message principal */}
						<div className='space-y-4'>
							<AlertTriangle className='size-16 text-orange-500 mx-auto' />
							<div>
								<h2 className='text-xl font-semibold text-gray-900 mb-2'>
									Produit non trouvé
								</h2>
								<p className='text-gray-600 mb-4'>
									Ce produit n'existe pas dans la base
									OpenFoodFacts.
								</p>
								{productDraft.scannedBarcode && (
									<p className='text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded'>
										Code-barre :{' '}
										{productDraft.scannedBarcode}
									</p>
								)}
							</div>
						</div>

						{/* Actions */}
						<div className='space-y-3'>
							<button
								onClick={handleCreateManually}
								className='w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2'>
								<Plus className='size-5' />
								<span>Créer ce produit manuellement</span>
							</button>

							<button
								onClick={handleBackToScan}
								className='w-full px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2'>
								<Scan className='size-5' />
								<span>Scanner un autre produit</span>
							</button>

							{/* Lien OpenFoodFacts pour contribuer */}
							<div className='pt-4 border-t border-gray-200'>
								<p className='text-xs text-gray-500 mb-2'>
									Vous pouvez aider en ajoutant ce produit à
									OpenFoodFacts
								</p>
								<a
									href={`https://world.openfoodfacts.org/cgi/product_jqm2.pl?code=${productDraft.scannedBarcode}`}
									target='_blank'
									rel='noopener noreferrer'
									className='inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800'>
									<ExternalLink className='size-4' />
									<span>Contribuer à OpenFoodFacts</span>
								</a>
							</div>
						</div>
					</div>
				);

			case 'success':
				return (
					<div className='p-6 text-center space-y-6'>
						<CheckCircle2 className='size-16 text-green-500 mx-auto' />
						<div>
							<h2 className='text-xl font-semibold text-gray-900 mb-2'>
								Produit ajouté !
							</h2>
							<p className='text-gray-600'>
								{productDraft.offData?.name || 'Le produit'} a
								été ajouté à votre inventaire.
							</p>
						</div>
						<div className='animate-pulse bg-gray-200 h-2 rounded'></div>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div
			className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
			{renderStep()}
		</div>
	);
};

/**
 * Hook utilitaire pour gérer le flow de scan
 */
export const useProductScanFlow = () => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [step, setStep] = useState<FlowStep>('scan');

	const openScanner = useCallback(() => {
		setStep('scan');
		setIsOpen(true);
	}, []);

	const closeScanner = useCallback(() => {
		setIsOpen(false);
	}, []);

	const openManualForm = useCallback(() => {
		setStep('form');
		setIsOpen(true);
	}, []);

	return {
		isOpen,
		step,
		openScanner,
		closeScanner,
		openManualForm,
		setStep,
	};
};
