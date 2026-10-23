import type React from 'react';
import { useState, useEffect, useId } from 'react';
import {
	Search,
	SlidersHorizontal,
	X,
	Plus,
	Package,
	LayoutGrid,
	List,
	Trash2,
	Heart,
	Loader2,
	Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import type { StorageLocationFilter } from '@/schemas';
import ProductCard from '@/features/product/ProductCard';
import CategoryFilter from '@/components/common/CategoryFilter';
import {
	useInventoryItems,
	useInventoryLoading,
	useInventoryError,
	useInventoryActions,
} from '@/stores/inventoryStore';
import { useCategories } from '@/hooks/useCategories';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const CATEGORY_TO_STORAGE_MAPPING: Record<StorageLocationFilter, string[]> = {
	ALL: [],
	FRESH: ['refrigerator', 'fridge', 'frigo', 'réfrigérateur'],
	FREEZER: ['freezer', 'congélateur', 'congelateur'],
	PANTRY: ['pantry', 'placard', 'cupboard', 'épicerie', 'epicerie', 'other'],
} as const;

const InventoryPage: React.FC = () => {
	const [searchQuery, setSearchQuery] = useState('');
	const [activeStorageCategory, setActiveStorageCategory] =
		useState<StorageLocationFilter>('ALL');
	const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
	const [showFilters, setShowFilters] = useState(false);
	const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
		() => new Set()
	);
	const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
	const filtersPanelId = useId();

	const items = useInventoryItems(); // Items déjà enrichis avec expiryStatus par le store
	const isLoading = useInventoryLoading();
	const error = useInventoryError();
	const { fetchInventoryItems, removeInventoryItems, clearError } =
		useInventoryActions();
	const { user } = useAuthStore();
	const inventoryLimit = user?.capabilities.inventoryLimit ?? 50;
	const hasReachedInventoryLimit = items.length >= inventoryLimit;
	const hasExceededInventoryLimit = items.length > inventoryLimit;
	const isFreeLimit = inventoryLimit === 50;

	const {
		data: categories = [],
		isLoading: categoriesLoading,
		error: categoriesError,
	} = useCategories();

	useEffect(() => {
		fetchInventoryItems();
	}, [fetchInventoryItems]);

	useEffect(() => {
		if (error) {
			toast.error(error);
			clearError();
		}
	}, [error, clearError]);

	useEffect(() => {
		if (categoriesError) {
			toast.error('Erreur lors du chargement des catégories');
		}
	}, [categoriesError]);

	useEffect(() => {
		setSelectedItemIds((currentSelection) => {
			const availableItemIds = new Set(items.map((item) => item.id));
			const nextSelection = new Set(
				[...currentSelection].filter((id) => availableItemIds.has(id))
			);

			return nextSelection.size === currentSelection.size
				? currentSelection
				: nextSelection;
		});
	}, [items]);

	const filteredItems = items.filter((item) => {
		const matchesSearch =
			!searchQuery ||
			item.product.name
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			(item.product.brand &&
				item.product.brand
					.toLowerCase()
					.includes(searchQuery.toLowerCase()));

		let matchesStorageCategory = true;
		if (activeStorageCategory !== 'ALL') {
			if (item.storageLocation) {
				const storageLocations =
					CATEGORY_TO_STORAGE_MAPPING[activeStorageCategory];
				matchesStorageCategory = storageLocations.some((location) =>
					item.storageLocation?.toLowerCase().includes(location)
				);
			} else {
				// Si pas de lieu de stockage défini, considérer comme placard
				matchesStorageCategory = activeStorageCategory === 'PANTRY';
			}
		}

		// ===== FILTRE PAR CATÉGORIE DE PRODUIT =====
		const matchesProductCategory =
			!selectedCategoryId ||
			item.product.category.id === selectedCategoryId;
		const matchesFavorite = !showFavoritesOnly || item.isFavorite;

		return (
			matchesSearch &&
			matchesStorageCategory &&
			matchesProductCategory &&
			matchesFavorite
		);
	});

	// ===== TRI DES ITEMS =====
	// Trier par date d'expiration (les plus proches en premier)
	const sortedItems = [...filteredItems].sort((a, b) => {
		if (!a.expiryDate) return 1;
		if (!b.expiryDate) return -1;
		return (
			new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
		);
	});

	const selectedCount = selectedItemIds.size;
	const sortedItemIds = sortedItems.map((item) => item.id);
	const areAllVisibleItemsSelected =
		sortedItemIds.length > 0 &&
		sortedItemIds.every((id) => selectedItemIds.has(id));

	// ===== UTILITAIRES =====

	const clearAllFilters = () => {
		setSearchQuery('');
		setActiveStorageCategory('ALL');
		setSelectedCategoryId('');
		setShowFavoritesOnly(false);
		setShowFilters(false);
	};

	const clearSelection = () => {
		setSelectedItemIds(new Set());
	};

	const openSelectionMode = () => {
		setIsSelectionMode(true);
	};

	const closeSelectionMode = () => {
		clearSelection();
		setIsSelectionMode(false);
	};

	const toggleItemSelection = (itemId: string) => {
		setSelectedItemIds((currentSelection) => {
			const nextSelection = new Set(currentSelection);

			if (nextSelection.has(itemId)) {
				nextSelection.delete(itemId);
			} else {
				nextSelection.add(itemId);
			}

			return nextSelection;
		});
	};

	const toggleSelectAllVisibleItems = () => {
		setSelectedItemIds((currentSelection) => {
			const nextSelection = new Set(currentSelection);

			if (areAllVisibleItemsSelected) {
				sortedItemIds.forEach((id) => nextSelection.delete(id));
			} else {
				sortedItemIds.forEach((id) => nextSelection.add(id));
			}

			return nextSelection;
		});
	};

	const handleRemoveSelectedItems = async () => {
		if (selectedCount === 0) {
			return;
		}

		try {
			await removeInventoryItems([...selectedItemIds]);
			setIsConfirmingRemoval(false);
			closeSelectionMode();
		} catch {
			toast.error('Erreur lors de la suppression des produits');
		}
	};

	const hasActiveFilters =
		searchQuery ||
		activeStorageCategory !== 'ALL' ||
		selectedCategoryId ||
		showFavoritesOnly;

	const getSelectedCategoryName = () => {
		if (!selectedCategoryId) return null;
		const category = categories.find(
			(cat) => cat.id === selectedCategoryId
		);
		return category?.name || 'Catégorie inconnue';
	};

	const productLabel = (count: number) => `produit${count > 1 ? 's' : ''}`;

	return (
		<div className='mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-12 lg:py-6'>
			<header className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h1 className='type-h1 text-neutral-900'>Inventaire</h1>
					<p className='text-sm text-neutral-600'>
						{items.length} {productLabel(items.length)} sur {inventoryLimit}
					</p>
				</div>
				<Button
					asChild
					variant={hasReachedInventoryLimit ? 'brand' : 'primary'}
					className={cn(!hasReachedInventoryLimit && 'hidden sm:inline-flex')}>
					<Link to={hasReachedInventoryLimit ? '/app/subscription' : '/app/inventory/add'}>
						{hasReachedInventoryLimit ? (
							<Sparkles aria-hidden='true' />
						) : (
							<Plus aria-hidden='true' />
						)}
						{hasReachedInventoryLimit ? 'Passer Premium' : 'Ajouter un produit'}
					</Link>
				</Button>
			</header>

			{hasReachedInventoryLimit && (
				<p role='status' className='rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700'>
					{hasExceededInventoryLimit && isFreeLimit
						? 'Votre inventaire dépasse la limite Free de 50 articles. Supprimez des articles ou passez Premium pour en ajouter.'
						: `Limite d’inventaire atteinte : ${inventoryLimit} articles. Passez Premium pour en ajouter.`}
				</p>
			)}

			{/* ===== RECHERCHE ===== */}
			<div className='relative'>
				<label htmlFor='inventory-search' className='sr-only'>
					Rechercher un produit ou une marque
				</label>
				<Search
					className='pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-neutral-600'
					aria-hidden='true'
				/>
				<Input
					id='inventory-search'
					type='search'
					placeholder='Rechercher un produit ou une marque…'
					className='h-12 bg-surface pl-11 pr-12'
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
				{searchQuery && (
					<button
						type='button'
						onClick={() => setSearchQuery('')}
						aria-label='Effacer la recherche'
						className='absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'>
						<X className='size-5' aria-hidden='true' />
					</button>
				)}
			</div>

			<CategoryFilter
				activeCategory={activeStorageCategory}
				onCategoryChange={setActiveStorageCategory}
			/>

			{/* ===== OUTILS ===== */}
			<div className='flex flex-wrap items-center gap-2'>
				<Button
					variant='secondary'
					onClick={() => setShowFilters(!showFilters)}
					aria-expanded={showFilters}
					aria-controls={filtersPanelId}
					className={cn(selectedCategoryId && 'border-accent-600 text-accent-700')}>
					<SlidersHorizontal aria-hidden='true' />
					Filtres
					{selectedCategoryId && (
						<span className='rounded-full bg-accent-600 px-1.5 text-xs font-semibold text-surface'>
							1
						</span>
					)}
				</Button>
				<Button
					variant='secondary'
					onClick={() => setShowFavoritesOnly((current) => !current)}
					aria-pressed={showFavoritesOnly}
					className={cn(showFavoritesOnly && 'border-danger-600 bg-danger-50 text-danger-700 hover:bg-danger-50')}>
					<Heart className={cn(showFavoritesOnly && 'fill-current')} aria-hidden='true' />
					Favoris
				</Button>

				<div className='ml-auto flex items-center gap-2'>
					{isSelectionMode && sortedItems.length > 0 ? (
						<label className='inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-neutral-300 bg-surface px-3 text-sm font-medium text-neutral-900'>
							<input
								type='checkbox'
								checked={areAllVisibleItemsSelected}
								onChange={toggleSelectAllVisibleItems}
								disabled={isLoading}
								className='size-4 accent-accent-600'
							/>
							Tout sélectionner
						</label>
					) : sortedItems.length > 0 ? (
						<Button
							variant='secondary'
							size='icon'
							onClick={openSelectionMode}
							disabled={isLoading}
							aria-label='Supprimer des produits'>
							<Trash2 aria-hidden='true' />
						</Button>
					) : null}

					<div role='group' aria-label='Affichage' className='hidden items-center rounded-md border border-neutral-300 bg-surface p-0.5 md:flex'>
						<button
							type='button'
							onClick={() => setViewMode('grid')}
							aria-pressed={viewMode === 'grid'}
							aria-label='Affichage en grille'
							className={cn(
								'flex size-9 cursor-pointer items-center justify-center rounded-sm transition-colors',
								viewMode === 'grid' ? 'bg-accent-50 text-accent-800' : 'text-neutral-600 hover:text-neutral-900'
							)}>
							<LayoutGrid className='size-4' aria-hidden='true' />
						</button>
						<button
							type='button'
							onClick={() => setViewMode('list')}
							aria-pressed={viewMode === 'list'}
							aria-label='Affichage en liste'
							className={cn(
								'flex size-9 cursor-pointer items-center justify-center rounded-sm transition-colors',
								viewMode === 'list' ? 'bg-accent-50 text-accent-800' : 'text-neutral-600 hover:text-neutral-900'
							)}>
							<List className='size-4' aria-hidden='true' />
						</button>
					</div>
				</div>
			</div>

			{/* ===== PANNEAU FILTRES ===== */}
			{showFilters && (
				<section id={filtersPanelId} aria-label='Filtres' className='card flex flex-col gap-4 p-4 sm:flex-row sm:items-end'>
					<div className='flex flex-1 flex-col gap-1.5'>
						<label htmlFor='inventory-category' className='text-sm font-medium text-neutral-900'>
							Catégorie de produit
						</label>
						{categoriesLoading ? (
							<p className='text-sm text-neutral-600'>Chargement des catégories…</p>
						) : (
							<select
								id='inventory-category'
								value={selectedCategoryId}
								onChange={(e) => setSelectedCategoryId(e.target.value)}
								className='h-11 w-full cursor-pointer rounded-md border border-input bg-surface px-3 text-neutral-900'>
								<option value=''>Toutes les catégories</option>
								{categories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
						)}
					</div>
					<div className='flex gap-2'>
						<Button variant='ghost' onClick={clearAllFilters}>
							Tout effacer
						</Button>
						<Button onClick={() => setShowFilters(false)}>Fermer</Button>
					</div>
				</section>
			)}

			{/* ===== FILTRES ACTIFS ===== */}
			{hasActiveFilters && (
				<ul aria-label='Filtres actifs' className='flex flex-wrap gap-2'>
					{searchQuery && (
						<li className='inline-flex items-center gap-1 rounded-full bg-accent-50 py-1 pl-3 pr-1 text-sm font-medium text-accent-800'>
							Recherche : « {searchQuery} »
							<button
								type='button'
								onClick={() => setSearchQuery('')}
								aria-label='Retirer la recherche'
								className='flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-accent-100'>
								<X className='size-4' aria-hidden='true' />
							</button>
						</li>
					)}
					{selectedCategoryId && (
						<li className='inline-flex items-center gap-1 rounded-full bg-accent-50 py-1 pl-3 pr-1 text-sm font-medium text-accent-800'>
							Catégorie : {getSelectedCategoryName()}
							<button
								type='button'
								onClick={() => setSelectedCategoryId('')}
								aria-label='Retirer le filtre de catégorie'
								className='flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-accent-100'>
								<X className='size-4' aria-hidden='true' />
							</button>
						</li>
					)}
					{showFavoritesOnly && (
						<li className='inline-flex items-center gap-1 rounded-full bg-danger-50 py-1 pl-3 pr-1 text-sm font-medium text-danger-700'>
							Favoris
							<button
								type='button'
								onClick={() => setShowFavoritesOnly(false)}
								aria-label='Retirer le filtre favoris'
								className='flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-surface'>
								<X className='size-4' aria-hidden='true' />
							</button>
						</li>
					)}
				</ul>
			)}

			{/* ===== SÉLECTION ===== */}
			{isSelectionMode && (
				<div className='card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
					<p aria-live='polite' className='font-medium text-neutral-900'>
						{selectedCount > 0
							? `${selectedCount} ${productLabel(selectedCount)} sélectionné${selectedCount > 1 ? 's' : ''}`
							: 'Sélectionnez les produits à supprimer'}
					</p>
					<div className='flex gap-2'>
						<Button variant='secondary' onClick={closeSelectionMode} disabled={isLoading}>
							Annuler
						</Button>
						<Button
							variant='error'
							onClick={() => setIsConfirmingRemoval(true)}
							disabled={isLoading || selectedCount === 0}>
							<Trash2 aria-hidden='true' />
							Supprimer
						</Button>
					</div>
				</div>
			)}

			{/* ===== LISTE ===== */}
			<p aria-live='polite' className='sr-only'>
				{isLoading ? '' : `${sortedItems.length} ${productLabel(sortedItems.length)} affiché${sortedItems.length > 1 ? 's' : ''}`}
			</p>

			{isLoading ? (
				<p role='status' className='flex items-center justify-center gap-3 py-16 text-neutral-600'>
					<Loader2 className='size-6 animate-spin text-accent-600' aria-hidden='true' />
					Chargement de votre inventaire…
				</p>
			) : sortedItems.length > 0 ? (
				<ul
					className={cn(
						'grid gap-3 lg:gap-4',
						viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1'
					)}>
					{sortedItems.map((item) => (
						<li key={item.id} className='min-w-0'>
							<ProductCard
								item={item}
								isSelectionMode={isSelectionMode}
								isSelected={selectedItemIds.has(item.id)}
								onToggleSelection={() => toggleItemSelection(item.id)}
							/>
						</li>
					))}
				</ul>
			) : (
				<div className='card flex flex-col items-center gap-3 px-6 py-12 text-center'>
					<span className='flex size-14 items-center justify-center rounded-lg bg-brand-50 text-brand-800'>
						{showFavoritesOnly ? (
							<Heart className='size-7' aria-hidden='true' />
						) : (
							<Package className='size-7' aria-hidden='true' />
						)}
					</span>
					<h2 className='type-h2 text-neutral-900'>
						{showFavoritesOnly
							? 'Aucun produit favori'
							: hasActiveFilters
								? 'Aucun produit trouvé'
								: 'Votre inventaire est vide'}
					</h2>
					<p className='max-w-md text-neutral-700'>
						{showFavoritesOnly
							? 'Ajoutez des produits à vos favoris depuis leur fiche pour les retrouver ici.'
							: hasActiveFilters
								? 'Aucun produit ne correspond à vos critères. Essayez de modifier vos filtres.'
								: 'Ajoutez vos premiers produits pour suivre leurs dates de péremption.'}
					</p>
					{hasActiveFilters ? (
						<Button variant='secondary' onClick={clearAllFilters} className='mt-2'>
							Effacer les filtres
						</Button>
					) : (
						<Button asChild className='mt-2'>
							<Link to='/app/inventory/add'>
								<Plus aria-hidden='true' />
								Ajouter un produit
							</Link>
						</Button>
					)}
				</div>
			)}

			<AlertDialog open={isConfirmingRemoval} onOpenChange={setIsConfirmingRemoval}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Supprimer {selectedCount} {productLabel(selectedCount)} ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{selectedCount > 1 ? 'Ces produits seront retirés' : 'Ce produit sera retiré'} de
							votre inventaire. Cette action est définitive.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({ variant: 'error' })}
							onClick={(event) => {
								event.preventDefault();
								void handleRemoveSelectedItems();
							}}
							disabled={isLoading}>
							{isLoading ? 'Suppression…' : 'Supprimer'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default InventoryPage;
