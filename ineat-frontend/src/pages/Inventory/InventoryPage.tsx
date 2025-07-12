import { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@tanstack/react-router';

// ===== IMPORTS SCHÉMAS ZOD =====
import { StorageLocationFilter } from '@/schemas';

// ===== IMPORTS COMPOSANTS =====
import ProductCard from '@/components/common/ProductCard';
import CategoryFilter from '@/components/common/CategoryFilter';

// ===== IMPORTS STORE ET HOOKS =====
import {
	useInventoryItems,
	useInventoryLoading,
	useInventoryError,
	useInventoryActions,
} from '@/stores/inventoryStore';
import { useCategories } from '@/hooks/useCategories';

// ===== MAPPING ENTRE CATÉGORIES ET LIEUX DE STOCKAGE =====
const CATEGORY_TO_STORAGE_MAPPING: Record<StorageLocationFilter, string[]> = {
	ALL: [],
	FRESH: ['refrigerator', 'fridge', 'frigo', 'réfrigérateur'],
	FREEZER: ['freezer', 'congélateur', 'congelateur'],
	PANTRY: ['pantry', 'placard', 'cupboard', 'épicerie', 'epicerie', 'other'],
} as const;

// ===== COMPOSANT PRINCIPAL =====
const InventoryPage: React.FC = () => {
	// ===== ÉTAT LOCAL =====
	const [searchQuery, setSearchQuery] = useState('');
	const [activeStorageCategory, setActiveStorageCategory] = useState<StorageLocationFilter>('ALL');
	const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
	const [showFilters, setShowFilters] = useState(false);

	// ===== STORE INVENTORY =====
	const items = useInventoryItems(); // Items déjà enrichis avec expiryStatus par le store
	const isLoading = useInventoryLoading();
	const error = useInventoryError();
	const { fetchInventoryItems, clearError } = useInventoryActions();

	// ===== HOOK CATÉGORIES =====
	const { 
		data: categories = [], 
		isLoading: categoriesLoading, 
		error: categoriesError 
	} = useCategories();

	// ===== EFFECTS =====

	// Charger les données au montage du composant
	useEffect(() => {
		fetchInventoryItems();
	}, [fetchInventoryItems]);

	// Gérer les erreurs
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

	// ===== LOGIQUE DE FILTRAGE =====

	// Filtrer les items selon tous les critères
	const filteredItems = items.filter((item) => {
		// ===== FILTRE DE RECHERCHE =====
		const matchesSearch = !searchQuery || 
			item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(item.product.brand && item.product.brand.toLowerCase().includes(searchQuery.toLowerCase()));

		// ===== FILTRE PAR LIEU DE STOCKAGE =====
		let matchesStorageCategory = true;
		if (activeStorageCategory !== 'ALL') {
			if (item.storageLocation) {
				const storageLocations = CATEGORY_TO_STORAGE_MAPPING[activeStorageCategory];
				matchesStorageCategory = storageLocations.some((location) =>
					item.storageLocation?.toLowerCase().includes(location)
				);
			} else {
				// Si pas de lieu de stockage défini, considérer comme placard
				matchesStorageCategory = activeStorageCategory === 'PANTRY';
			}
		}

		// ===== FILTRE PAR CATÉGORIE DE PRODUIT =====
		const matchesProductCategory = !selectedCategoryId || 
			item.product.category.id === selectedCategoryId;

		return matchesSearch && matchesStorageCategory && matchesProductCategory;
	});

	// ===== TRI DES ITEMS =====
	// Trier par date d'expiration (les plus proches en premier)
	const sortedItems = [...filteredItems].sort((a, b) => {
		if (!a.expiryDate) return 1;
		if (!b.expiryDate) return -1;
		return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
	});

	// ===== UTILITAIRES =====

	const clearAllFilters = () => {
		setSearchQuery('');
		setActiveStorageCategory('ALL');
		setSelectedCategoryId('');
		setShowFilters(false);
	};

	const hasActiveFilters = searchQuery || activeStorageCategory !== 'ALL' || selectedCategoryId;

	const getSelectedCategoryName = () => {
		if (!selectedCategoryId) return null;
		const category = categories.find(cat => cat.id === selectedCategoryId);
		return category?.name || 'Catégorie inconnue';
	};

	// ===== RENDU =====
	return (
		<div className='flex flex-col h-full bg-primary-50'>
			{/* ===== HEADER AVEC AVATAR ET TITRE ===== */}
			<div className='px-4 py-6 flex items-center gap-4'>
				<div className='size-16 rounded-full bg-primary-100 overflow-hidden'>
					<img
						src='https://i.pravatar.cc/300'
						alt='Avatar utilisateur'
						className='size-full object-cover'
					/>
				</div>
				<h1 className='text-3xl font-bold font-display'>Mon Inventaire</h1>
			</div>

			{/* ===== BARRE DE RECHERCHE ===== */}
			<div className='px-4 mb-4'>
				<div className='relative'>
					<div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
						<Search className='size-5 text-neutral-200' />
					</div>
					<input
						type='text'
						placeholder='Rechercher un produit'
						className='py-3 pl-10 pr-4 w-full rounded-full bg-neutral-50 border-0 shadow-sm focus:ring-2 focus:ring-accent focus:outline-none'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</div>

			{/* ===== FILTRES PAR LIEU DE STOCKAGE ===== */}
			<div className='px-4 mb-4'>
				<CategoryFilter
					activeCategory={activeStorageCategory}
					onCategoryChange={setActiveStorageCategory}
				/>
			</div>

			{/* ===== BOUTON FILTRES AVANCÉS ===== */}
			<div className='px-4 mb-4'>
				<button
					onClick={() => setShowFilters(!showFilters)}
					className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
						hasActiveFilters
							? 'bg-accent text-white border-accent'
							: 'bg-white text-neutral-600 border-neutral-200 hover:border-accent'
					}`}>
					<Filter className='size-4' />
					<span>Filtres</span>
					{hasActiveFilters && (
						<span className='bg-white/20 text-xs px-2 py-0.5 rounded-full'>
							{(searchQuery ? 1 : 0) + 
							 (activeStorageCategory !== 'ALL' ? 1 : 0) + 
							 (selectedCategoryId ? 1 : 0)}
						</span>
					)}
				</button>
			</div>

			{/* ===== PANNEAU FILTRES AVANCÉS ===== */}
			{showFilters && (
				<div className='px-4 mb-4'>
					<div className='bg-white rounded-xl p-4 shadow-sm border border-neutral-200'>
						<div className='flex items-center justify-between mb-4'>
							<h3 className='font-semibold text-neutral-900'>Filtres</h3>
							<button
								onClick={() => setShowFilters(false)}
								className='text-neutral-400 hover:text-neutral-600'>
								<X className='size-5' />
							</button>
						</div>

						{/* ===== FILTRE PAR CATÉGORIE DE PRODUIT ===== */}
						<div className='space-y-3'>
							<div>
								<label className='block text-sm font-medium text-neutral-700 mb-2'>
									Catégorie de produit
								</label>
								{categoriesLoading ? (
									<div className='text-sm text-neutral-500'>Chargement des catégories...</div>
								) : (
									<select
										value={selectedCategoryId}
										onChange={(e) => setSelectedCategoryId(e.target.value)}
										className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent'>
										<option value=''>Toutes les catégories</option>
										{categories.map((category) => (
											<option key={category.id} value={category.id}>
												{category.name}
											</option>
										))}
									</select>
								)}
							</div>

							{/* ===== BOUTONS D'ACTION ===== */}
							<div className='flex justify-between pt-3 border-t border-neutral-200'>
								<button
									onClick={clearAllFilters}
									className='text-neutral-600 hover:text-neutral-900 transition-colors'>
									Effacer tous les filtres
								</button>
								<button
									onClick={() => setShowFilters(false)}
									className='bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/80 transition-colors'>
									Appliquer
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ===== FILTRES ACTIFS (TAGS) ===== */}
			{hasActiveFilters && (
				<div className='px-4 mb-4'>
					<div className='flex flex-wrap gap-2'>
						{searchQuery && (
							<div className='flex items-center gap-1 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm'>
								<span>Recherche: "{searchQuery}"</span>
								<button
									onClick={() => setSearchQuery('')}
									className='hover:bg-accent/20 rounded-full p-0.5'>
									<X className='size-3' />
								</button>
							</div>
						)}
						
						{activeStorageCategory !== 'ALL' && (
							<div className='flex items-center gap-1 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm'>
								<span>Lieu: {activeStorageCategory.toLowerCase()}</span>
								<button
									onClick={() => setActiveStorageCategory('ALL')}
									className='hover:bg-accent/20 rounded-full p-0.5'>
									<X className='size-3' />
								</button>
							</div>
						)}
						
						{selectedCategoryId && (
							<div className='flex items-center gap-1 bg-accent/10 text-accent px-3 py-1 rounded-full text-sm'>
								<span>Catégorie: {getSelectedCategoryName()}</span>
								<button
									onClick={() => setSelectedCategoryId('')}
									className='hover:bg-accent/20 rounded-full p-0.5'>
									<X className='size-3' />
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* ===== LISTE DES PRODUITS ===== */}
			<div className='flex-1 px-4 pb-20 overflow-auto'>
				{isLoading ? (
					// ===== ÉTAT DE CHARGEMENT =====
					<div className='flex justify-center items-center h-40'>
						<div className='animate-spin rounded-full size-8 border-b-2 border-accent'></div>
					</div>
				) : sortedItems.length > 0 ? (
					// ===== LISTE DES PRODUITS =====
					<div className='space-y-4'>
						{sortedItems.map((item) => (
							<ProductCard key={item.id} item={item} />
						))}
					</div>
				) : (
					// ===== ÉTAT VIDE =====
					<div className='flex flex-col items-center justify-center h-40 text-center'>
						<p className='text-neutral-200 mb-2'>
							{hasActiveFilters
								? 'Aucun produit trouvé'
								: 'Votre inventaire est vide'}
						</p>
						<p className='text-sm text-neutral-200'>
							{hasActiveFilters
								? 'Modifiez vos critères de recherche'
								: 'Commencez par ajouter des produits'}
						</p>
						{hasActiveFilters ? (
							<button
								onClick={clearAllFilters}
								className='mt-4 px-6 py-2 rounded-full bg-neutral-200 text-neutral-600 font-medium hover:bg-neutral-300 transition-colors'>
								Effacer les filtres
							</button>
						) : (
							<Link
								to='/app/inventory/add'
								className='mt-4 px-6 py-2 rounded-full bg-accent text-neutral-50 font-medium hover:bg-accent-600 transition-colors'>
								Ajouter un produit
							</Link>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default InventoryPage;