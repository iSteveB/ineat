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
	CardHeader,
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
			console.log('Produit trouvé dans OpenFoodFacts:', localProduct);

			setFlowData({
				offProductData: localProduct,
				scannedBarcode: flowData.scannedBarcode, // Garder le code-barre scanné
				isNewProduct: true, // Par défaut nouveau, sera vérifié
			});

			// Vérifier si existe en local
			await checkIfProductExists(localProduct);
			setCurrentStep('form');
		},
		[flowData.scannedBarcode, checkIfProductExists]
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
	 * ✅ NOUVEAU : Création manuelle (produit non trouvé dans OFF)
	 * Au lieu de naviguer, on passe en mode formulaire manuel en interne
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
					<Card className='w-full h-full overflow-y-auto'>
						<CardHeader>
							<Button
								variant='ghost'
								size='sm'
								onClick={handleBackToScan}
								className='absolute left-6 top-6 text-neutral-600 hover:bg-neutral-100'>
								<ArrowLeft className='size-5' />
							</Button>
							<CardTitle className='text-xl font-semibold text-neutral-900 pt-12'>
								{flowData.isNewProduct
									? 'Nouveau produit'
									: 'Produit existant'}
							</CardTitle>
							{flowData.offProductData && (
								<CardDescription>
									{flowData.offProductData.name}{' '}
									{flowData.offProductData.brand &&
										`• ${flowData.offProductData.brand}`}
								</CardDescription>
							)}
						</CardHeader>
						<CardContent>
							{/* Information sur le produit existant */}
							{!flowData.isNewProduct &&
								flowData.existingProduct && (
									<Alert className='mb-6 border-info-200 bg-info-50 text-info-800'>
										<Package className='size-5' />
										<AlertTitle>
											Produit déjà dans votre inventaire
										</AlertTitle>
										<AlertDescription>
											Ce produit existe déjà. Vous pouvez
											l'ajouter directement.
										</AlertDescription>
									</Alert>
								)}

							{/* Information nouveau produit */}
							{flowData.isNewProduct &&
								flowData.offProductData?.name && (
									<Alert className='mb-6 border-success-200 bg-success-50 text-success-800'>
										<Plus className='size-5' />
										<AlertTitle>Nouveau produit</AlertTitle>
										<AlertDescription>
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
									defaultBarcode={flowData.scannedBarcode}
								/>
							) : (
								flowData.existingProduct && (
									<ExistingProductQuickAddForm
										product={flowData.existingProduct}
										onSubmit={handleExistingProductSubmit}
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
								<Alert variant='warning'>
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
						</CardContent>
					</Card>
				);

			case 'not-found':
				return (
					<Card className='w-full h-full flex flex-col items-center justify-center text-center p-6'>
						<Button
							variant='ghost'
							size='icon'
							onClick={handleBackToScan}
							className='absolute left-6 top-6 text-neutral-600 hover:bg-neutral-100'>
							<ArrowLeft className='size-5' />
						</Button>

						<div className='space-y-4 mb-6'>
							<AlertTriangle className='size-16 text-warning-500 mx-auto' />
							<div>
								<CardTitle className='text-xl font-semibold text-neutral-900 mb-2'>
									Produit non trouvé
								</CardTitle>
								<CardDescription className='text-neutral-600 mb-4'>
									Ce produit n'existe pas dans OpenFoodFacts.
								</CardDescription>
								{flowData.scannedBarcode && (
									<p className='text-sm text-neutral-500 font-mono bg-neutral-100 px-3 py-1 rounded-md inline-block'>
										Code-barre : {flowData.scannedBarcode}
									</p>
								)}
							</div>
						</div>

						<div className='space-y-3 w-full max-w-sm'>
							<Button
								onClick={handleCreateManually}
								className='w-full'
								size='lg'>
								<Plus className='size-5 mr-2' />
								<span>Créer ce produit manuellement</span>
							</Button>

							<Button
								onClick={handleBackToScan}
								variant='outline'
								className='w-full'
								size='lg'>
								<Scan className='size-5 mr-2' />
								<span>Scanner un autre produit</span>
							</Button>

							<div className='pt-4 border-t border-neutral-200 mt-6'>
								<p className='text-xs text-neutral-500 mb-2'>
									Vous pouvez aider en ajoutant ce produit à
									OpenFoodFacts
								</p>
								<a
									href='https://fr.openfoodfacts.org/contribuer'
									target='_blank'
									rel='noopener noreferrer'
									className='inline-flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-800'>
									<ExternalLink className='size-4' />
									<span>Contribuer à OpenFoodFacts</span>
								</a>
							</div>
						</div>
					</Card>
				);

			case 'success':
				return (
					<Card className='size-full flex flex-col items-center justify-center text-center p-6'>
						<CheckCircle2 className='size-16 text-success-500 mx-auto mb-4' />
						<div>
							<CardTitle className='text-xl font-semibold text-neutral-900 mb-2'>
								Produit ajouté !
							</CardTitle>
							<CardDescription className='text-neutral-600'>
								{flowData.offProductData?.name || 'Le produit'}{' '}
								a été ajouté à votre inventaire.
							</CardDescription>
						</div>
						<div className='animate-pulse bg-neutral-200 h-2 rounded w-1/2 mt-6'></div>
					</Card>
				);

			default:
				return <div>État inconnu</div>;
		}
	};

	return (
		<div
			className={`bg-neutral-50 rounded-2xl shadow-xl overflow-hidden ${className}`}>
			{renderStep()}
		</div>
	);
};