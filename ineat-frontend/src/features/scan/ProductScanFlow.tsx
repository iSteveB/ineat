import type React from 'react';
import { useState, useCallback } from 'react';
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
import type { Product } from '@/schemas/product';
import type { AddInventoryItemData } from '@/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	inventoryService,
	type ProductSearchResult,
	type QuickAddFormDataWithCategory,
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
import type { FlowStep } from '@/hooks/useProductScanFlow';

/**
 * Données du produit en cours d'ajout
 */
interface ProductDraft {
	scannedBarcode?: string;
	offData?: Partial<Product>;
	productSearchResult?: ProductSearchResult;
}

interface ProductScanFlowProps {
	onComplete?: () => void;
	onCancel?: () => void;
	defaultStep?: FlowStep;
	className?: string;
}

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
	const handleProductFound = useCallback(
		(localProduct: Partial<Product>): void => {
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
		},
		[]
	);

	/**
	 * Gère les produits non trouvés dans OFF
	 */
	const handleProductNotFound = useCallback((barcode: string): void => {
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
	const handleScanError = useCallback((errorMessage: string): void => {
		setError(errorMessage);
	}, []);

	/**
	 * Gère la soumission du formulaire QuickAdd
	 * Convertit QuickAddFormDataWithCategory vers AddInventoryItemData
	 * et utilise addManualProduct pour créer un nouveau produit
	 */
	const handleFormSubmit = useCallback(
		async (formData: QuickAddFormDataWithCategory): Promise<void> => {
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
	const handleBackToScan = useCallback((): void => {
		setCurrentStep('scan');
		setProductDraft({});
		setError(null);
	}, []);

	/**
	 * Redirige vers la création manuelle complète
	 */
	const handleCreateManually = useCallback((): void => {
		const barcode = productDraft.scannedBarcode;
		const search = barcode ? `?barcode=${barcode}` : '';
		router.navigate({ to: `/app/inventory/add/search${search}` });
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
					<Card className='w-full h-full flex flex-col'>
						<CardHeader className='flex flex-row items-center justify-between pb-4'>
							<div className='flex items-center space-x-3'>
								<Button
									variant='ghost'
									size='icon'
									onClick={handleBackToScan}
									className='text-neutral-600 hover:bg-neutral-100'>
									<ArrowLeft className='size-5' />
								</Button>
								<div>
									<CardTitle className='text-xl font-semibold text-neutral-900'>
										Ajouter le produit
									</CardTitle>
									<CardDescription className='text-sm text-neutral-600'>
										Complétez les informations
									</CardDescription>
								</div>
							</div>
							<Package className='size-8 text-primary-500' />
						</CardHeader>
						<CardContent className='flex-1 overflow-y-auto p-6 pt-0 space-y-6'>
							{/* Infos du produit trouvé */}
							{productDraft.offData && (
								<Alert variant='success'>
									<CheckCircle2 className='size-5' />
									<AlertTitle>Produit trouvé !</AlertTitle>
									<AlertDescription>
										<p>
											<strong>Nom :</strong>{' '}
											{productDraft.offData.name}
										</p>
										<p>
											<strong>Marque :</strong>{' '}
											{productDraft.offData.brand}
										</p>
									</AlertDescription>
								</Alert>
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
								<Alert variant='error'>
									<AlertTriangle className='size-5' />
									<AlertTitle>
										Erreur lors de l'ajout
									</AlertTitle>
									<AlertDescription>
										{error ||
											addManualProductMutation.error
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
								{productDraft.scannedBarcode && (
									<p className='text-sm text-neutral-500 font-mono bg-neutral-100 px-3 py-1 rounded-md inline-block'>
										Code-barre :{' '}
										{productDraft.scannedBarcode}
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
									href={`https://fr.openfoodfacts.org/contribuer`}
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
					<Card className='w-full h-full flex flex-col items-center justify-center text-center p-6'>
						<CheckCircle2 className='size-16 text-success-500 mx-auto mb-4' />
						<div>
							<CardTitle className='text-xl font-semibold text-neutral-900 mb-2'>
								Produit ajouté !
							</CardTitle>
							<CardDescription className='text-neutral-600'>
								{productDraft.offData?.name || 'Le produit'} a
								été ajouté à votre inventaire.
							</CardDescription>
						</div>
						<div className='animate-pulse bg-neutral-200 h-2 rounded w-1/2 mt-6'></div>
					</Card>
				);

			default:
				return null;
		}
	};

	return (
		<div
			className={`bg-neutral-50 rounded-2xl shadow-xl overflow-hidden ${className}`}>
			{renderStep()}
		</div>
	);
};
