import React, { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package, Plus, Search, AlertCircle, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Composants de recherche et ajout
import { ProductSearchBar } from '@/features/product/ProductSearchBar';
import { ProductSearchResults } from '@/features/product/ProductSearchResult';
import { QuickAddForm } from '@/features/inventory/components/QuickAddForm';
import { AddManualProductForm } from '@/features/inventory/components/AddManualProductForm';

// Services et types - utilisation du nouveau système avec budget
import {
	inventoryService,
	ProductSearchResult,
	QuickAddFormData,
	ProductAddedWithBudgetResult,
} from '@/services/inventoryService';
import { AddInventoryItemData } from '@/schemas';

// États de la page
type PageState = 'search' | 'quick-add' | 'manual-add';

export const AddManualProductPage: React.FC = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// États
	const [pageState, setPageState] = useState<PageState>('search');
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<ProductSearchResult[]>(
		[]
	);
	const [selectedProduct, setSelectedProduct] =
		useState<ProductSearchResult | null>(null);
	const [isSearching, setIsSearching] = useState(false);

	// Query pour récupérer les catégories
	const { data: categories = [] } = useQuery({
		queryKey: ['categories'],
		queryFn: inventoryService.getCategories,
		staleTime: 1000 * 60 * 60, // 1 heure
	});

	// Fonction pour gérer le succès avec feedback budgétaire
	const handleProductAddedSuccess = (
		result: ProductAddedWithBudgetResult
	) => {
		// Affichage de la notification selon le type
		switch (result.type) {
			case 'success':
				toast.success(result.message);
				break;
			case 'info':
				toast.info(result.message);
				break;
			case 'warning':
				toast.warning(result.message);
				break;
		}

		// Si une dépense a été créée, rafraîchir les données budget
		if (result.shouldRefreshBudget) {
			// Invalider les queries budget pour forcer le rechargement
			queryClient.invalidateQueries({ queryKey: ['budget', 'current'] });
			queryClient.invalidateQueries({ queryKey: ['budget', 'stats'] });

			// Optionnel : afficher des informations budget supplémentaires
			if (result.budgetInfo.remainingBudget !== undefined) {
				console.log(
					`Budget restant: ${result.budgetInfo.remainingBudget.toFixed(
						2
					)}€`
				);
			}
		}

		// Invalider l'inventaire pour afficher le nouveau produit
		queryClient.invalidateQueries({ queryKey: ['inventory'] });

		// Redirection vers l'inventaire
		navigate({ to: '/app/inventory' });
	};

	// Fonction pour gérer les erreurs
	const handleProductAddedError = (error: Error, productName?: string) => {
		console.error("Erreur lors de l'ajout du produit:", error);
		toast.error(
			error.message ||
				`Erreur lors de l'ajout${
					productName ? ` de ${productName}` : ' du produit'
				}`
		);
	};

	// Mutation pour l'ajout rapide avec feedback budgétaire
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
			// CORRECTION : Utiliser 'name' au lieu de 'productName'
			const productName = variables.name;
			handleProductAddedError(error, productName);
		},
	});

	// Gestion de la recherche
	const handleSearch = async (query: string) => {
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
			console.error('Erreur de recherche:', error);
			toast.error('Erreur lors de la recherche');
			setSearchResults([]);
		} finally {
			setIsSearching(false);
		}
	};

	// Gestion de la sélection d'un produit
	const handleSelectProduct = (product: ProductSearchResult) => {
		setSelectedProduct(product);
		setPageState('quick-add');
	};

	// Gestion de l'ajout rapide
	const handleQuickAdd = async (data: QuickAddFormData) => {
		await quickAddMutation.mutateAsync(data);
	};

	// Gestion de l'ajout manuel
	const handleManualAdd = async (data: AddInventoryItemData) => {
		// CORRECTION : Supprimer le cast 'as never' qui masque les erreurs de type
		await manualAddMutation.mutateAsync(data);
	};

	// Réinitialisation de la recherche
	const handleClearSearch = () => {
		setSearchQuery('');
		setSearchResults([]);
		setSelectedProduct(null);
		setPageState('search');
	};

	// Passer au formulaire complet
	const handleSwitchToManualAdd = () => {
		setPageState('manual-add');
	};

	// Retour à la recherche
	const handleBackToSearch = () => {
		setSelectedProduct(null);
		setPageState('search');
	};

	return (
		<div className='min-h-screen bg-neutral-50'>
			{/* Header */}
			<div className='bg-neutral-50 border-b border-neutral-100'>
				<div className='max-w-4xl mx-auto px-4 py-4'>
					<div className='flex items-center space-x-4'>
						<Link
							to='/app/inventory/add'
							className='p-2 hover:bg-neutral-100 rounded-full transition-colors'>
							<ArrowLeft className='size-5 text-neutral-300' />
						</Link>

						<div>
							<h1 className="text-xl font-semibold text-neutral-300 font-['Fredoka']">
								Recherche et ajout manuel
							</h1>
							<p className='text-sm text-neutral-200 mt-1'>
								Recherchez un produit existant ou créez-en un
								nouveau
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className='max-w-4xl mx-auto px-4 py-6'>
				<div className='flex items-start justify-between mb-6'>
					<div className='flex-1'>
						{pageState === 'search' &&
							searchResults.length === 0 &&
							searchQuery && (
								<Button
									onClick={handleSwitchToManualAdd}
									variant='outline'
									size='sm'
									className='ml-auto'>
									<Plus className='size-4 mr-2' />
									Créer un nouveau produit
								</Button>
							)}
					</div>
				</div>

				{/* Contenu principal selon l'état */}
				{pageState === 'search' && (
					<div className='space-y-6'>
						{/* Barre de recherche */}
						<Card className='p-6'>
							<div className='flex items-start space-x-4'>
								<div className='size-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0'>
									<Search className='size-5 text-accent' />
								</div>
								<div className='flex-1 space-y-3'>
									<h2 className='text-lg font-semibold text-neutral-300'>
										Rechercher un produit existant
									</h2>
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
								</div>
							</div>
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
								<Alert className='border-warning-50/20 bg-warning-50/10'>
									<AlertCircle className='size-4 text-warning-50' />
									<AlertDescription className='text-neutral-300'>
										Aucun produit trouvé pour "{searchQuery}
										".{' '}
										<Button
											variant='link'
											className='px-1 h-auto font-medium'
											onClick={handleSwitchToManualAdd}>
											Créer ce produit
										</Button>
									</AlertDescription>
								</Alert>
							)}

						{/* Aide initiale */}
						{!searchQuery && (
							<Card className='p-8 text-center border-dashed'>
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
											n'existe pas, vous pourrez le créer.
										</p>
									</div>
									<div className='flex items-center space-x-4 text-sm text-neutral-200'>
										<span>ou</span>
										<Button
											variant='link'
											className='text-accent'
											onClick={handleSwitchToManualAdd}>
											Créer directement un nouveau produit
										</Button>
									</div>
								</div>
							</Card>
						)}
					</div>
				)}

				{/* État ajout rapide */}
				{pageState === 'quick-add' && selectedProduct && (
					<Card className='p-6'>
						<QuickAddForm
							product={selectedProduct}
							onSubmit={handleQuickAdd}
							onCancel={handleBackToSearch}
							isSubmitting={quickAddMutation.isPending}
						/>
					</Card>
				)}

				{/* État ajout manuel */}
				{pageState === 'manual-add' && (
					<Card className='p-6'>
						<div className='space-y-6'>
							{searchQuery && (
								<Alert className='border-primary-100 bg-primary-50/50'>
									<AlertDescription className='text-neutral-300'>
										Vous créez un nouveau produit :{' '}
										<strong>"{searchQuery}"</strong>
									</AlertDescription>
								</Alert>
							)}
							<AddManualProductForm
								categories={categories}
								onSubmit={handleManualAdd}
								onCancel={handleBackToSearch}
								isSubmitting={manualAddMutation.isPending}
								defaultProductName={searchQuery}
							/>
						</div>
					</Card>
				)}
			</div>
		</div>
	);
};
