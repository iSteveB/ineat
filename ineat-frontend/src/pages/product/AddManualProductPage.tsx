import React, { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package, Plus, Search, AlertCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { ProductSearchBar } from '@/features/product/ProductSearchBar';
import { ProductSearchResults } from '@/features/product/ProductSearchResult';
import { ExistingProductQuickAddForm } from '@/features/inventory/components/ExistingProductQuickAddForm';
import { AddManualProductForm } from '@/features/inventory/components/AddManualProductForm';

import {
	inventoryService,
	type ProductSearchResult,
	type QuickAddFormData,
	type ProductAddedWithBudgetResult,
} from '@/services/inventoryService';
import type { AddInventoryItemData } from '@/schemas';

type PageState = 'search' | 'quick-add' | 'manual-add';

const AddManualProductPage: React.FC = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// États locaux simplifiés
	const [pageState, setPageState] = useState<PageState>('search');
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [searchResults, setSearchResults] = useState<ProductSearchResult[]>(
		[]
	);
	const [selectedProduct, setSelectedProduct] =
		useState<ProductSearchResult | null>(null);
	const [isSearching, setIsSearching] = useState<boolean>(false);

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
		// Affichage de la notification selon le type
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

		// Si une dépense a été créée, rafraîchir les données budget
		if (result.shouldRefreshBudget) {
			queryClient.invalidateQueries({ queryKey: ['budget', 'current'] });
			queryClient.invalidateQueries({ queryKey: ['budget', 'stats'] });
		}

		// Invalider l'inventaire pour afficher le nouveau produit
		queryClient.invalidateQueries({ queryKey: ['inventory'] });

		// Redirection vers l'inventaire
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

	// Gestion de la sélection d'un produit
	const handleSelectProduct = (product: ProductSearchResult): void => {
		console.log('Produit sélectionné:', product);
		setSelectedProduct(product);
		setPageState('quick-add');
	};

	// Gestion de l'ajout rapide avec le bon type
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
		setPageState('search');
	};

	// Passer au formulaire complet
	const handleSwitchToManualAdd = (): void => {
		setPageState('manual-add');
	};

	// Retour à la recherche
	const handleBackToSearch = (): void => {
		setSelectedProduct(null);
		setPageState('search');
	};

	return (
		<div className='min-h-screen bg-neutral-50'>
			{/* ===== HEADER ===== */}
			<div className='relative overflow-hidden bg-neutral-50 border-b border-neutral-100 shadow-sm'>
				<div className='absolute top-0 right-0 size-32 bg-success-50/10 rounded-full blur-3xl -translate-y-16 translate-x-16' />

				<div className='relative px-6 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						<Link to='/app/inventory/add'>
							<Button
								variant='ghost'
								size='sm'
								className='size-10 p-0 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 shadow-sm'>
								<ArrowLeft className='size-5 text-neutral-300' />
							</Button>
						</Link>
						<div>
							<h1 className='text-2xl font-bold text-neutral-300'>
								Ajouter un produit
							</h1>
							<p className='text-sm text-neutral-200'>
								Recherchez ou créez un nouveau produit
							</p>
						</div>
					</div>

					{pageState === 'search' &&
						searchResults.length === 0 &&
						searchQuery && (
							<Button
								onClick={handleSwitchToManualAdd}
								variant='outline'
								size='sm'
								className='flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-300 shadow-sm'>
								<Plus className='size-4' />
								Créer un nouveau produit
							</Button>
						)}
				</div>
			</div>

			{/* Content */}
			<div className='max-w-4xl mx-auto px-4 py-6 space-y-6'>
				{/* État de recherche */}
				{pageState === 'search' && (
					<div className='space-y-6'>
						{/* Barre de recherche */}
						<Card className='relative overflow-hidden border-0 bg-neutral-50 shadow-xl'>
							<CardHeader>
								<CardTitle className='flex items-center gap-3'>
									<div className='p-2 rounded-xl bg-success-50/20 border border-success-50/50'>
										<Search className='size-5 text-success-50' />
									</div>
									Rechercher un produit existant
								</CardTitle>
							</CardHeader>
							<CardContent className='p-6 pt-0 space-y-3'>
								<p className='text-sm text-neutral-200'>
									Commencez par rechercher si le produit
									existe déjà dans notre base de données
								</p>
								<ProductSearchBar
									onSearch={handleSearch}
									onClear={handleClearSearch}
									isLoading={isSearching}
									autoFocus
								/>
							</CardContent>
						</Card>

						{/* Résultats de recherche */}
						{(searchResults.length > 0 ||
							(searchQuery && !isSearching)) && (
							<ProductSearchResults
								results={searchResults}
								onSelectProduct={handleSelectProduct}
								isLoading={isSearching}
								searchQuery={searchQuery}
							/>
						)}

						{/* Message si aucun résultat */}
						{searchResults.length === 0 &&
							searchQuery &&
							!isSearching && (
								<Alert className='border-warning-50/20 bg-warning-50/10 text-neutral-300'>
									<AlertCircle className='size-4 text-warning-50' />
									<AlertDescription>
										Aucun produit trouvé pour "{searchQuery}
										".{' '}
										<Button
											variant='link'
											className='px-1 h-auto font-medium text-success-50 hover:text-success-50/90'
											onClick={handleSwitchToManualAdd}>
											Créer ce produit
										</Button>
									</AlertDescription>
								</Alert>
							)}

						{/* Aide initiale */}
						{!searchQuery && (
							<Card className='relative overflow-hidden border-0 bg-neutral-50 shadow-xl'>
								<CardContent className='p-8 text-center'>
									<div className='flex flex-col items-center space-y-4'>
										<div className='size-16 rounded-full bg-neutral-100 flex items-center justify-center'>
											<Package className='size-8 text-neutral-200' />
										</div>
										<div className='space-y-2'>
											<h3 className='text-lg font-medium text-neutral-300'>
												Commencez par rechercher
											</h3>
											<p className='text-sm text-neutral-200 max-w-md mx-auto'>
												Tapez le nom, la marque ou le
												code-barres du produit que vous
												souhaitez ajouter. Si le produit
												n'existe pas, vous pourrez le
												créer.
											</p>
										</div>
										<div className='flex flex-col items-center space-x-4 text-sm text-neutral-200'>
											<span>ou</span>
											<Button
												variant='link'
												className='text-success-50 hover:text-success-50/90'
												onClick={
													handleSwitchToManualAdd
												}>
												Créer directement un nouveau
												produit
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				)}

				{/* État ajout rapide avec produit existant */}
				{pageState === 'quick-add' && selectedProduct && (
					<Card className='relative overflow-hidden border-0 bg-neutral-50 shadow-xl'>
						<CardHeader>
							<CardTitle className='flex items-center gap-3'>
								<div className='p-2 rounded-xl bg-success-50/20 border border-success-50/50'>
									<Plus className='size-5 text-success-50' />
								</div>
								Ajout rapide : {selectedProduct.name}
							</CardTitle>
						</CardHeader>
						<CardContent className='p-6 pt-0'>
							<ExistingProductQuickAddForm
								product={selectedProduct}
								onSubmit={handleQuickAdd}
								onCancel={handleBackToSearch}
								isSubmitting={quickAddMutation.isPending}
							/>
						</CardContent>
					</Card>
				)}

				{/* État ajout manuel */}
				{pageState === 'manual-add' && (
					<AddManualProductForm
						categories={categories}
						onSubmit={handleManualAdd}
						onCancel={handleBackToSearch}
						isSubmitting={manualAddMutation.isPending}
						defaultProductName={searchQuery} // Utilise la recherche en cours
					/>
				)}
			</div>
		</div>
	);
};

export default AddManualProductPage;
