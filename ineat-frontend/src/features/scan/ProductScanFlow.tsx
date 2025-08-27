import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
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
import { AddManualProductForm } from '@/features/inventory/components/AddManualProductForm';
import { ExistingProductQuickAddForm } from '@/features/inventory/components/ExistingProductQuickAddForm';
import type { Product } from '@/schemas/product';
import type { AddInventoryItemData } from '@/schemas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	inventoryService,
	type ProductSearchResult,
	type QuickAddFormData,
} from '@/services/inventoryService';
import {
	Card,
	CardContent,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type FlowStep = 'scan' | 'form' | 'not-found' | 'success';

/**
 * Données minimales pour orchestrer le flow
 */
interface FlowData {
	scannedBarcode?: string;
	offProductData?: Partial<Product>; // Données depuis OpenFoodFacts
	existingProduct?: ProductSearchResult; // Produit existant trouvé en local
	isNewProduct: boolean; // true = nouveau, false = existant
}

interface ProductScanFlowProps {
	onComplete?: () => void;
	onCancel?: () => void;
	defaultStep?: FlowStep;
	initialProductData?: Partial<Product>;
	className?: string;
}

export const ProductScanFlow: React.FC<ProductScanFlowProps> = ({
	onComplete,
	onCancel,
	defaultStep = 'scan',
	initialProductData,
	className = '',
}) => {
	const queryClient = useQueryClient();

	// États locaux simplifiés
	const [currentStep, setCurrentStep] = useState<FlowStep>(defaultStep);
	const [flowData, setFlowData] = useState<FlowData>({
		isNewProduct: true,
	});

	// Récupération des catégories (nécessaire pour AddManualProductForm)
	const { data: categories = [] } = useQuery({
		queryKey: ['categories'],
		queryFn: inventoryService.getCategories,
		staleTime: 1000 * 60 * 60, // 1 heure
	});

	/**
	 * Vérification si un produit existe déjà en local
	 */
	const checkIfProductExists = useCallback(
		async (productData: Partial<Product>): Promise<void> => {
			if (!productData.name) return;

			try {
				console.log('Vérification du produit existant:', productData);
				const searchResults = await inventoryService.searchProducts(
					productData.name
				);

				// Chercher une correspondance exacte
				const existingProduct = searchResults.find(
					(product: ProductSearchResult) => {
						const sameName =
							product.name.toLowerCase() ===
							(productData.name || '').toLowerCase();
						const sameBrand =
							product.brand?.toLowerCase() ===
							(productData.brand || '').toLowerCase();
						return (
							sameName &&
							(sameBrand ||
								(!product.brand && !productData.brand))
						);
					}
				);

				if (existingProduct) {
					console.log('Produit existant trouvé:', existingProduct);
					setFlowData((prev) => ({
						...prev,
						existingProduct,
						isNewProduct: false,
					}));
				}
			} catch (error) {
				console.error(
					'Erreur lors de la vérification du produit existant:',
					error
				);
				// En cas d'erreur, traiter comme nouveau produit
			}
		},
		[]
	);

	// Mutation pour l'ajout de nouveaux produits
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

			// Passer à l'écran de succès
			setCurrentStep('success');
			setTimeout(() => {
				onComplete?.();
			}, 1500);
		},
		onError: (error: Error) => {
			toast.error("Erreur lors de l'ajout", {
				description: error.message,
			});
		},
	});

	// Mutation pour l'ajout de produits existants
	const addExistingProductMutation = useMutation({
		mutationFn: inventoryService.addExistingProductToInventory,
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

			// Passer à l'écran de succès
			setCurrentStep('success');
			setTimeout(() => {
				onComplete?.();
			}, 1500);
		},
		onError: (error: Error) => {
			toast.error("Erreur lors de l'ajout", {
				description: error.message,
			});
		},
	});

	/**
	 * Initialisation avec des données de produit (utilisé pour reprendre un scan précédent)
	 */
	useEffect(() => {
		if (initialProductData && defaultStep === 'form') {
			setFlowData({
				offProductData: initialProductData,
				scannedBarcode: initialProductData.barcode,
				isNewProduct: true, // Par défaut, on suppose que c'est nouveau
			});

			// Vérifier si le produit existe déjà en arrière-plan
			checkIfProductExists(initialProductData);
			setCurrentStep('form');
		}
	}, [initialProductData, defaultStep, checkIfProductExists]);

	/**
	 * Gestionnaire quand un produit est trouvé via scan/saisie dans OpenFoodFacts
	 */
	const handleProductFound = useCallback(
	async (localProduct: Partial<Product>): Promise<void> => {

		setFlowData({
			offProductData: localProduct,
			scannedBarcode: localProduct.barcode,
			isNewProduct: true,
		});

		// Vérifier si existe en local
		await checkIfProductExists(localProduct);
		setCurrentStep('form');
	},
	[checkIfProductExists]
);

	/**
	 * Gestionnaire quand un produit n'est pas trouvé dans OpenFoodFacts
	 */
	const handleProductNotFound = useCallback((barcode: string): void => {
		console.log('Produit non trouvé dans OpenFoodFacts:', barcode);

		setFlowData({
			scannedBarcode: barcode,
			isNewProduct: true,
		});

		setCurrentStep('not-found');
	}, []);

	/**
	 * Gestionnaire d'erreur de scan
	 */
	const handleScanError = useCallback((errorMessage: string): void => {
		console.error('Erreur de scan:', errorMessage);
		// On reste sur l'écran de scan, l'erreur est gérée par BarcodeScanner
	}, []);

	/**
	 * Gestionnaire de soumission pour produit existant
	 */
	const handleExistingProductSubmit = useCallback(
		async (formData: QuickAddFormData): Promise<void> => {
			console.log('Ajout produit existant:', formData);
			await addExistingProductMutation.mutateAsync(formData);
		},
		[addExistingProductMutation]
	);

	/**
	 * Gestionnaire de soumission pour nouveau produit
	 */
	const handleNewProductSubmit = useCallback(
		async (formData: AddInventoryItemData): Promise<void> => {
			console.log('Ajout nouveau produit:', formData);
			await addManualProductMutation.mutateAsync(formData);
		},
		[addManualProductMutation]
	);

	/**
	 * Retour au scan depuis les autres écrans
	 */
	const handleBackToScan = useCallback((): void => {
		setCurrentStep('scan');
		setFlowData({ isNewProduct: true });
	}, []);

	/**
	 * Création manuelle (produit non trouvé dans OFF)
	 */
	const handleCreateManually = useCallback((): void => {
		// Préparer les données du produit avec le code-barre scanné
		const productData: Partial<Product> = {
			name: `Produit ${flowData.scannedBarcode}`, // Nom par défaut
			barcode: flowData.scannedBarcode,
		};

		setFlowData((prev) => ({
			...prev,
			isNewProduct: true,
			offProductData: productData,
		}));

		// Basculer vers le formulaire
		setCurrentStep('form');
	}, [flowData.scannedBarcode]);

	/**
	 * Rendu conditionnel selon l'étape actuelle
	 */
	const renderStep = (): React.ReactElement => {
		switch (currentStep) {
			case 'scan':
				return (
					<BarcodeScanner
						onProductFound={handleProductFound}
						onProductNotFound={handleProductNotFound}
						onError={handleScanError}
						onClose={onCancel}
					/>
				);

			case 'form':
				return (
					<div className='min-h-screen bg-neutral-50'>
						{/* Header */}
						<div className='relative bg-neutral-50 border-b border-neutral-100 shadow-sm'>
							<div className='absolute top-0 right-0 size-32 bg-primary-50/20 rounded-full blur-3xl -translate-y-16 translate-x-16' />

							<div className='relative px-6 py-4 flex items-center gap-4'>
								<Button
									variant='ghost'
									size='sm'
									onClick={handleBackToScan}
									className='size-10 p-0 rounded-xl bg-neutral-50 border border-neutral-200 shadow-sm'>
									<ArrowLeft className='size-5 text-neutral-600' />
								</Button>
								<div className='flex items-center gap-3'>
									<div className='p-2 rounded-xl bg-primary-50/20 border border-success-50/50'>
										<Package className='size-5 text-neutral-300' />
									</div>
									<div>
										<h1 className='text-xl font-bold text-neutral-900'>
											{flowData.isNewProduct
												? 'Nouveau produit'
												: 'Produit existant'}
										</h1>
										{flowData.offProductData && (
											<p className='text-sm text-neutral-600'>
												{flowData.offProductData.name}
												{flowData.offProductData
													.brand &&
													` • ${flowData.offProductData.brand}`}
											</p>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Contenu principal */}
						<div className='p-6'>
							{/* Information sur le produit existant */}
							{!flowData.isNewProduct &&
								flowData.existingProduct && (
									<Alert className='mb-6 border-primary-200 bg-primary-50'>
										<Package className='size-5 text-primary-600' />
										<AlertTitle className='text-primary-800'>
											Produit déjà dans votre inventaire
										</AlertTitle>
										<AlertDescription className='text-primary-700'>
											Ce produit existe déjà. Vous pouvez
											l'ajouter directement.
										</AlertDescription>
									</Alert>
								)}

							{/* Information nouveau produit */}
							{flowData.isNewProduct &&
								flowData.offProductData?.name && (
									<Alert className='mb-6 border-neutral-150 bg-primary-50'>
										<Plus className='size-5 text-neutral-150' />
										<AlertTitle className='text-neutral-150'>
											Nouveau produit scanné
										</AlertTitle>
										<AlertDescription className='text-success-700'>
											{flowData.offProductData?.barcode
												? 'Ce produit sera ajouté à votre inventaire avec ses informations.'
												: "Vous pouvez l'ajouter directement."}
										</AlertDescription>
									</Alert>
								)}
	
									{/* Formulaire approprié */}
									{flowData.isNewProduct ? (
										<AddManualProductForm
											categories={categories}
											onSubmit={handleNewProductSubmit}
											onCancel={handleBackToScan}
											isSubmitting={
												addManualProductMutation.isPending
											}
											defaultProductName={
												flowData.offProductData?.name
											}
											defaultBrand={
												flowData.offProductData?.brand
											}
											defaultBarcode={
												flowData.scannedBarcode
											}
										/>
									) : (
										flowData.existingProduct && (
											<ExistingProductQuickAddForm
												product={
													flowData.existingProduct
												}
												onSubmit={
													handleExistingProductSubmit
												}
												onCancel={handleBackToScan}
												isSubmitting={
													addExistingProductMutation.isPending
												}
											/>
										)
									)}
				
							{/* Erreurs des mutations */}
							{(addManualProductMutation.error ||
								addExistingProductMutation.error) && (
								<Alert variant='warning' className='mt-6'>
									<AlertTriangle className='size-5' />
									<AlertTitle>
										Erreur lors de l'ajout
									</AlertTitle>
									<AlertDescription>
										{addManualProductMutation.error
											?.message ||
											addExistingProductMutation.error
												?.message}
									</AlertDescription>
								</Alert>
							)}
						</div>
					</div>
				);

			case 'not-found':
				return (
					<div className='min-h-screen bg-neutral-50 flex flex-col'>
						{/* Header avec bouton retour */}
						<div className='relative bg-white border-b border-neutral-100 shadow-sm'>
							<div className='absolute top-0 right-0 size-32 bg-warning-50/20 rounded-full blur-3xl -translate-y-16 translate-x-16' />

							<div className='relative px-6 py-4 flex items-center gap-4'>
								<Button
									variant='ghost'
									size='sm'
									onClick={handleBackToScan}
									className='size-10 p-0 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 shadow-sm'>
									<ArrowLeft className='size-5 text-neutral-600' />
								</Button>
								<div className='flex items-center gap-3'>
									<div className='p-2 rounded-xl bg-warning-50/20 border border-warning-100/50'>
										<AlertTriangle className='size-5 text-warning-600' />
									</div>
									<div>
										<h1 className='text-xl font-bold text-neutral-900'>
											Produit non trouvé
										</h1>
										<p className='text-sm text-neutral-600'>
											Ce produit n'existe pas dans
											OpenFoodFacts
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Contenu centré */}
						<div className='flex-1 flex items-center justify-center p-6'>
							<Card className='w-full max-w-md border-0 bg-white shadow-xl rounded-2xl'>
								<CardContent className='p-8 text-center space-y-6'>
									<div className='space-y-4'>
										<AlertTriangle className='size-20 text-warning-500 mx-auto' />
										<div>
											<CardTitle className='text-xl font-semibold text-neutral-900 mb-2'>
												Produit introuvable
											</CardTitle>
											<CardDescription className='text-neutral-600 mb-4'>
												Ce produit n'existe pas dans la
												base OpenFoodFacts.
											</CardDescription>
											{flowData.scannedBarcode && (
												<div className='inline-flex items-center px-3 py-2 bg-neutral-100 rounded-lg'>
													<span className='text-sm text-neutral-600 font-medium'>
														Code-barre :
													</span>
													<span className='text-sm text-neutral-900 font-mono ml-2'>
														{
															flowData.scannedBarcode
														}
													</span>
												</div>
											)}
										</div>
									</div>

									<div className='space-y-3'>
										<Button
											onClick={handleCreateManually}
											className='w-full h-12 bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-300'
											size='lg'>
											<Plus className='size-5 mr-2' />
											<span>
												Créer ce produit manuellement
											</span>
										</Button>

										<Button
											onClick={handleBackToScan}
											variant='outline'
											className='w-full h-12 border-neutral-200 text-neutral-700 hover:bg-neutral-50'
											size='lg'>
											<Scan className='size-5 mr-2' />
											<span>
												Scanner un autre produit
											</span>
										</Button>
									</div>

									<div className='pt-6 border-t border-neutral-100'>
										<p className='text-xs text-neutral-500 mb-3'>
											Vous pouvez aider en ajoutant ce
											produit à OpenFoodFacts
										</p>
										<a
											href='https://fr.openfoodfacts.org/contribuer'
											target='_blank'
											rel='noopener noreferrer'
											className='inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 transition-colors'>
											<ExternalLink className='size-4' />
											<span>
												Contribuer à OpenFoodFacts
											</span>
										</a>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				);

			case 'success':
				return (
					<div className='min-h-screen bg-neutral-50 flex items-center justify-center p-6'>
						<Card className='w-full max-w-md border-0 bg-white shadow-xl rounded-2xl'>
							<CardContent className='p-8 text-center space-y-6'>
								<CheckCircle2 className='size-20 text-success-500 mx-auto animate-pulse' />
								<div>
									<CardTitle className='text-xl font-semibold text-neutral-900 mb-2'>
										Produit ajouté avec succès !
									</CardTitle>
									<CardDescription className='text-neutral-600'>
										{flowData.offProductData?.name ||
											'Le produit'}{' '}
										a été ajouté à votre inventaire.
									</CardDescription>
								</div>
								<div className='w-32 h-2 bg-neutral-200 rounded-full mx-auto overflow-hidden'>
									<div className='h-full bg-success-500 rounded-full animate-pulse'></div>
								</div>
							</CardContent>
						</Card>
					</div>
				);

			default:
				return <div>État inconnu</div>;
		}
	};

	return <div className={`${className}`}>{renderStep()}</div>;
};
