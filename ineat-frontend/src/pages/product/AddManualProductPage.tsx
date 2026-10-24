import React, { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	Package,
	Plus,
	Search,
	AlertCircle,
	ArrowLeft,
	Star,
} from 'lucide-react';
import WidgetCard from '@/components/common/WidgetCard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { ProductSearchBar } from '@/features/product/ProductSearchBar';
import { ProductSearchResults } from '@/features/product/ProductSearchResult';
import { ExistingProductQuickAddForm } from '@/features/inventory/form/ExistingProductQuickAddForm';
import { AddManualProductForm } from '@/features/inventory/form/AddManualProductForm';

import {
	inventoryService,
	type ProductSearchResult,
	type QuickAddFormData,
	type ProductAddedWithBudgetResult,
} from '@/services/inventoryService';
import type { AddInventoryItemData } from '@/schemas';
import type { OpenFoodFactsMapping } from '@/schemas/openfoodfact-mapping';
import { formatCurrency } from '@/schemas/budget';

type PageState = 'search' | 'quick-add' | 'manual-add';

const AddManualProductPage: React.FC = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// États locaux
	const [pageState, setPageState] = useState<PageState>('search');
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [searchResults, setSearchResults] = useState<ProductSearchResult[]>(
		[]
	);
	const [selectedProduct, setSelectedProduct] =
		useState<ProductSearchResult | null>(null);
	const [isSearching, setIsSearching] = useState<boolean>(false);

	// NOUVEAU - État pour les données enrichies OpenFoodFacts
	const [enrichedProductData, setEnrichedProductData] =
		useState<OpenFoodFactsMapping | null>(null);
	const [scannedBarcode, setScannedBarcode] = useState<string>('');

	// Récupération des catégories
	const { data: categories = [] } = useQuery({
		queryKey: ['categories'],
		queryFn: inventoryService.getCategories,
		staleTime: 1000 * 60 * 60, // 1 heure
	});

	// Fonction pour gérer le succès avec feedback budgétaire
	const handleProductAddedSuccess = (
		result: ProductAddedWithBudgetResult
	): void => {
		const budgetDescription = result.budgetInfo.expenseCreated
			? result.budgetInfo.remainingBudget !== undefined
				? `Budget restant : ${formatCurrency(result.budgetInfo.remainingBudget)}`
				: 'Dépense ajoutée au budget'
			: "Aucune dépense n'a été créée";

		switch (result.type) {
			case 'success':
				toast.success(result.message);
				break;
			case 'info':
				toast.info(result.message, {
					description: budgetDescription,
				});
				break;
			case 'warning':
				toast.warning(result.message, {
					description: budgetDescription,
				});
				break;
		}

		if (result.shouldRefreshBudget) {
			queryClient.invalidateQueries({ queryKey: ['budget', 'current'] });
			queryClient.invalidateQueries({ queryKey: ['budget', 'stats'] });
		}

		queryClient.invalidateQueries({ queryKey: ['inventory'] });
		navigate({ to: '/app/inventory' });
	};

	// Fonction pour gérer les erreurs
	const handleProductAddedError = (
		error: Error,
		productName?: string
	): void => {
		toast.error(
			error.message ||
				`Erreur lors de l'ajout${
					productName ? ` de ${productName}` : ' du produit'
				}`
		);
	};

	// Mutation pour l'ajout rapide de produits existants
	const quickAddMutation = useMutation({
		mutationFn: inventoryService.addExistingProductToInventory,
		onSuccess: handleProductAddedSuccess,
		onError: (error: Error) => {
			const productName = selectedProduct?.name;
			handleProductAddedError(error, productName);
		},
	});

	// Mutation pour l'ajout manuel avec feedback budgétaire
	const manualAddMutation = useMutation({
		mutationFn: inventoryService.addManualProduct,
		onSuccess: handleProductAddedSuccess,
		onError: (error: Error, variables: AddInventoryItemData) => {
			const productName = variables.name;
			handleProductAddedError(error, productName);
		},
	});

	// Gestion de la recherche
	const handleSearch = async (query: string): Promise<void> => {
		if (!query || query.length < 2) {
			setSearchResults([]);
			return;
		}

		setIsSearching(true);
		setSearchQuery(query);

		try {
			const results = await inventoryService.searchProducts(query);
			setSearchResults(results);
		} catch (error) {
			console.error('Erreur lors de la recherche:', error);
			toast.error('Erreur lors de la recherche');
			setSearchResults([]);
		} finally {
			setIsSearching(false);
		}
	};

	// Gestion de la sélection d'un produit existant
	const handleSelectProduct = (product: ProductSearchResult): void => {
		console.log('Produit sélectionné:', product);
		setSelectedProduct(product);
		setPageState('quick-add');

		// NOUVEAU - Réinitialiser les données enrichies car ce n'est pas un scan
		setEnrichedProductData(null);
		setScannedBarcode('');
	};

	// Gestion de l'ajout rapide
	const handleQuickAdd = async (data: QuickAddFormData): Promise<void> => {
		console.log('Ajout rapide avec données:', data);
		await quickAddMutation.mutateAsync(data);
	};

	// Gestion de l'ajout manuel
	const handleManualAdd = async (
		data: AddInventoryItemData
	): Promise<void> => {
		console.log('Ajout manuel avec données:', data);
		await manualAddMutation.mutateAsync(data);
	};

	// Réinitialisation de la recherche
	const handleClearSearch = (): void => {
		setSearchQuery('');
		setSearchResults([]);
		setSelectedProduct(null);
		setEnrichedProductData(null);
		setScannedBarcode('');
		setPageState('search');
	};

	// Passer au formulaire complet
	const handleSwitchToManualAdd = (): void => {
		setPageState('manual-add');
		// Garder les données enrichies et le code-barre s'ils existent
	};

	// Retour à la recherche
	const handleBackToSearch = (): void => {
		setSelectedProduct(null);
		setEnrichedProductData(null);
		setScannedBarcode('');
		setPageState('search');
	};

	// NOUVEAU - Préparer les props pour le formulaire manuel
	const getManualFormProps = () => {
		const baseProps = {
			categories,
			onSubmit: handleManualAdd,
			onCancel: handleBackToSearch,
			isSubmitting: manualAddMutation.isPending,
		};

		// Si on a des données enrichies, les utiliser
		if (enrichedProductData) {
			return {
				...baseProps,
				enrichedProduct: enrichedProductData,
				// Les noms seront extraits depuis enrichedProduct dans le composant
				defaultBarcode: scannedBarcode,
			};
		}

		// Sinon, utiliser les données de recherche basique
		return {
			...baseProps,
			defaultProductName: searchQuery,
			defaultBarcode: scannedBarcode,
		};
	};

	const pageTitle =
		pageState === 'quick-add' && selectedProduct
			? selectedProduct.name
			: pageState === 'manual-add'
				? 'Nouveau produit'
				: 'Ajout manuel';

	return (
		<div className='mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-6 lg:py-6'>
			{pageState === 'search' ? (
				<Button asChild variant='ghost' className='-ml-3 self-start'>
					<Link to='/app/inventory/add'>
						<ArrowLeft aria-hidden='true' />
						Méthodes d’ajout
					</Link>
				</Button>
			) : (
				<Button variant='ghost' className='-ml-3 self-start' onClick={handleBackToSearch}>
					<ArrowLeft aria-hidden='true' />
					Retour à la recherche
				</Button>
			)}

			<header>
				<h1 className='type-h1 text-neutral-900'>{pageTitle}</h1>
				<p className='text-neutral-600'>
					{pageState === 'search'
						? 'Recherchez le produit, ou créez-le s’il n’existe pas.'
						: pageState === 'quick-add'
							? 'Indiquez la quantité et la date de péremption.'
							: 'Renseignez les informations du produit.'}
				</p>
			</header>

			{pageState === 'search' && (
				<>
					<WidgetCard title='Rechercher un produit'>
						<ProductSearchBar
							onSearch={handleSearch}
							onClear={handleClearSearch}
							isLoading={isSearching}
							autoFocus
						/>
						<p className='mt-2 text-sm text-neutral-600'>
							Nom, marque ou code-barres.
						</p>
					</WidgetCard>

					{(searchResults.length > 0 || (searchQuery && !isSearching)) && (
						<ProductSearchResults
							results={searchResults}
							onSelectProduct={handleSelectProduct}
							isLoading={isSearching}
							searchQuery={searchQuery}
						/>
					)}

					{searchResults.length === 0 && searchQuery && !isSearching && (
						<Alert variant='warning' role='status'>
							<AlertCircle aria-hidden='true' />
							<AlertDescription>
								<p>Aucun produit trouvé pour « {searchQuery} ».</p>
								<Button variant='secondary' size='sm' className='mt-1' onClick={handleSwitchToManualAdd}>
									<Plus aria-hidden='true' />
									Créer ce produit
								</Button>
							</AlertDescription>
						</Alert>
					)}

					{!searchQuery && (
						<div className='card flex flex-col items-center gap-3 px-6 py-10 text-center'>
							<span className='flex size-14 items-center justify-center rounded-lg bg-accent-50 text-accent-800'>
								<Search className='size-7' aria-hidden='true' />
							</span>
							<h2 className='type-h3 text-neutral-900'>Commencez par rechercher</h2>
							<p className='max-w-md text-sm text-neutral-700'>
								Si le produit existe déjà, il suffira d’indiquer la quantité et la date. Sinon,
								vous pourrez le créer.
							</p>
							<Button variant='secondary' onClick={handleSwitchToManualAdd} className='mt-1'>
								<Package aria-hidden='true' />
								Créer directement un produit
							</Button>
						</div>
					)}
				</>
			)}

			{pageState === 'quick-add' && selectedProduct && (
				<section aria-label='Ajout rapide' className='card p-4 sm:p-5'>
					<ExistingProductQuickAddForm
						product={selectedProduct}
						onSubmit={handleQuickAdd}
						onCancel={handleBackToSearch}
						isSubmitting={quickAddMutation.isPending}
						enrichedData={enrichedProductData}
					/>
				</section>
			)}

			{pageState === 'manual-add' && (
				<>
					{enrichedProductData && (
						<Alert variant='info' role='status'>
							<Star aria-hidden='true' />
							<AlertTitle>Données Open Food Facts trouvées</AlertTitle>
							<AlertDescription>
								Le formulaire est pré-rempli avec les informations disponibles (
								{Math.round(enrichedProductData.quality.completeness * 100)} % complètes).
							</AlertDescription>
						</Alert>
					)}

					<AddManualProductForm {...getManualFormProps()} />
				</>
			)}
		</div>
	);
};

export default AddManualProductPage;
