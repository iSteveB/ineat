import type React from 'react';
import { useState, useEffect } from 'react';
import { Search, Filter, X, Plus, Package, Grid3X3, List } from 'lucide-react';
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
import { getInitials } from '@/utils/ui-utils';

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
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

	const items = useInventoryItems(); // Items déjà enrichis avec expiryStatus par le store
	const isLoading = useInventoryLoading();
	const error = useInventoryError();
	const { fetchInventoryItems, clearError } = useInventoryActions();
	const { user } = useAuthStore();

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

		return (
			matchesSearch && matchesStorageCategory && matchesProductCategory
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

	// ===== UTILITAIRES =====

	const clearAllFilters = () => {
		setSearchQuery('');
		setActiveStorageCategory('ALL');
		setSelectedCategoryId('');
		setShowFilters(false);
	};

	const hasActiveFilters =
		searchQuery || activeStorageCategory !== 'ALL' || selectedCategoryId;

	const getSelectedCategoryName = () => {
		if (!selectedCategoryId) return null;
		const category = categories.find(
			(cat) => cat.id === selectedCategoryId
		);
		return category?.name || 'Catégorie inconnue';
	};

	return (
		<div className='flex flex-col h-full bg-gradient-to-br from-gray-50 to-blue-50/30'>
			<div className='relative overflow-hidden bg-neutral-50 border-b border-gray-200 shadow-sm'>
				<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

				<div className='relative px-6 py-4 flex items-center gap-4'>
					<div className='relative'>
						<div className='size-14 rounded-2xl bg-gradient-to-br from-primary-100/50 to-primary-100 overflow-hidden shadow-lg'>
							{user?.avatarUrl ? (
								<img
									src={user.avatarUrl}
									alt='Avatar utilisateur'
									className='size-full object-cover'
								/>
							) : (
								<div className='flex items-center justify-center size-full text-neutral-50 text-4xl'>
									{getInitials(
										user?.firstName || '',
										user?.lastName || ''
									)}
								</div>
							)}
						</div>
					</div>
					<div className='flex-1'>
						<h1 className='text-2xl font-bold text-gray-900 mb-1'>
							Mon Inventaire
						</h1>
						<p className='text-gray-600 text-sm'>
							{items.length} produit
							{items.length > 1 ? 's' : ''} dans votre inventaire
						</p>
					</div>
					<Link
						to='/app/inventory/add'
						className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-success-50 to-emerald-700 text-neutral-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'>
						<Plus className='size-4' />
						<span className='font-semibold'>Ajouter</span>
					</Link>
				</div>
			</div>

			{/* ===== BARRE DE RECHERCHE ===== */}
			<div className='px-6 py-5'>
				<div className='relative'>
					<div className='absolute inset-y-0 left-4 flex items-center pointer-events-none'>
						<Search className='size-5 text-gray-400' />
					</div>
					<input
						type='text'
						placeholder='Rechercher un produit ou une marque...'
						className='w-full pl-12 pr-4 py-4 bg-neutral-50 border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none transition-all duration-300'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					{searchQuery && (
						<button
							onClick={() => setSearchQuery('')}
							className='absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600'>
							<X className='size-5' />
						</button>
					)}
				</div>
			</div>

			{/* ===== FILTRES ET CONTRÔLES ===== */}
			<div className='px-6 space-y-5'>
				{/* Filtres par lieu de stockage */}
				<CategoryFilter
					activeCategory={activeStorageCategory}
					onCategoryChange={setActiveStorageCategory}
				/>

				{/* Contrôles avancés */}
				<div className='flex items-center justify-between pb-2'>
					<button
						onClick={() => setShowFilters(!showFilters)}
						className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all cursor-pointer duration-300 ${
							hasActiveFilters
								? 'bg-blue-500 text-neutral-50 border-blue-500 shadow-lg'
								: 'bg-neutral-50 text-gray-600 border-gray-200 hover:border-blue-500 hover:shadow-md'
						}`}>
						<Filter className='size-4 ' />

						{hasActiveFilters && (
							<span className='bg-neutral-50/20 text-xs px-2 py-0.5 rounded-full font-semibold'>
								{(searchQuery ? 1 : 0) +
									(activeStorageCategory !== 'ALL' ? 1 : 0) +
									(selectedCategoryId ? 1 : 0)}
							</span>
						)}
					</button>

					<div className='items-center gap-2 hidden md:flex'>
						<button
							onClick={() => setViewMode('grid')}
							className={`p-2 rounded-lg transition-colors ${
								viewMode === 'grid'
									? 'bg-blue-100 text-blue-600'
									: 'text-gray-400 hover:text-gray-600'
							}`}>
							<Grid3X3 className='size-4' />
						</button>
						<button
							onClick={() => setViewMode('list')}
							className={`p-2 rounded-lg transition-colors ${
								viewMode === 'list'
									? 'bg-blue-100 text-blue-600'
									: 'text-gray-400 hover:text-gray-600'
							}`}>
							<List className='size-4' />
						</button>
					</div>
				</div>
			</div>

			{/* ===== PANNEAU FILTRES AVANCÉS ===== */}
			{showFilters && (
				<div className='px-6 py-5'>
					<div className='bg-neutral-50 rounded-2xl p-6 shadow-lg border border-gray-200'>
						<div className='flex items-center justify-between mb-5'>
							<h3 className='text-lg font-bold text-gray-900'>
								Filtres
							</h3>
							<button
								onClick={() => setShowFilters(false)}
								className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'>
								<X className='size-5' />
							</button>
						</div>

						<div className='space-y-4'>
							<div>
								<label className='block text-sm font-semibold text-gray-700 mb-2'>
									Catégorie de produit
								</label>
								{categoriesLoading ? (
									<div className='text-sm text-gray-500 p-3 bg-gray-50 rounded-lg'>
										Chargement des catégories...
									</div>
								) : (
									<select
										value={selectedCategoryId}
										onChange={(e) =>
											setSelectedCategoryId(
												e.target.value
											)
										}
										className='w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300'>
										<option value=''>
											Toutes les catégories
										</option>
										{categories.map((category) => (
											<option
												key={category.id}
												value={category.id}>
												{category.name}
											</option>
										))}
									</select>
								)}
							</div>

							<div className='flex justify-between pt-5 border-t border-gray-200'>
								<button
									onClick={clearAllFilters}
									className='text-gray-600 hover:text-gray-900 font-medium cursor-pointer transition-colors'>
									Effacer tous les filtres
								</button>
								<button
									onClick={() => setShowFilters(false)}
									className='bg-success-50 text-neutral-50 px-6 py-2 rounded-xl hover:bg-success-50/80 cursor-pointer transition-colors font-semibold shadow-lg hover:shadow-xl'>
									Appliquer
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ===== FILTRES ACTIFS (TAGS) ===== */}
			{hasActiveFilters && (
				<div className='px-6 py-3'>
					<div className='flex flex-wrap gap-2'>
						{searchQuery && (
							<div className='flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-xl text-sm font-medium cursor-pointer'>
								<span>Recherche: "{searchQuery}"</span>
								<button
									onClick={() => setSearchQuery('')}
									className='hover:bg-blue-200 rounded-full p-0.5 transition-colors cursor-pointer'>
									<X className='size-3' />
								</button>
							</div>
						)}

						{selectedCategoryId && (
							<div className='flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-xl text-sm font-medium'>
								<span>
									Catégorie: {getSelectedCategoryName()}
								</span>
								<button
									onClick={() => setSelectedCategoryId('')}
									className='hover:bg-blue-200 rounded-full p-0.5 transition-colors'>
									<X className='size-3' />
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* ===== LISTE DES PRODUITS ===== */}
			<div className='flex-1 pb-28 overflow-auto'>
				<div className='px-4 sm:px-6'>
					{isLoading ? (
						// ===== ÉTAT DE CHARGEMENT =====
						<div className='flex flex-col justify-center items-center h-64'>
							<div className='relative'>
								<div className='size-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600' />
								<div className='absolute inset-0 size-16 border-4 border-transparent rounded-full animate-pulse border-t-blue-400' />
							</div>
							<div className='mt-6 text-center'>
								<p className='text-gray-700 font-medium'>
									Chargement de votre inventaire...
								</p>
								<p className='text-sm text-gray-500 mt-1'>
									Analyse de vos produits en cours
								</p>
							</div>
						</div>
					) : sortedItems.length > 0 ? (
						// ===== LISTE DES PRODUITS =====
						<div
							className={
								viewMode === 'grid'
									? 'grid gap-3 lg:gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
									: 'space-y-3 lg:space-y-4'
							}>
							{sortedItems.map((item, index) => (
								<div
									key={item.id}
									className='w-full overflow-hidden'
									style={{
										animationDelay: `${index * 50}ms`,
									}}>
									<ProductCard item={item} />
								</div>
							))}
						</div>
					) : (
						// ===== ÉTAT VIDE  =====
						<div className='flex flex-col items-center justify-center h-64 text-center pt-22'>
							<div className='relative mb-8'>
								<div className='size-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center'>
									<Package className='size-10 text-gray-400' />
								</div>
								<div className='absolute -top-2 -right-2 size-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg'>
									<Plus className='size-4 text-neutral-50' />
								</div>
							</div>
							<div className='space-y-3'>
								<h3 className='text-xl font-bold text-gray-900'>
									{hasActiveFilters
										? 'Aucun produit trouvé'
										: 'Votre inventaire est vide'}
								</h3>
								<p className='text-gray-600 max-w-md'>
									{hasActiveFilters
										? 'Aucun produit ne correspond à vos critères de recherche. Essayez de modifier vos filtres.'
										: 'Commencez par ajouter des produits à votre inventaire pour mieux gérer vos stocks.'}
								</p>
								{hasActiveFilters ? (
									<button
										onClick={clearAllFilters}
										className='mt-8 px-8 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors shadow-md hover:shadow-lg cursor-pointer'>
										Effacer les filtres
									</button>
								) : (
									<Link
										to='/app/inventory/add'
										className='inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-neutral-50 font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105'>
										<Plus className='size-5' />
										Ajouter un produit
									</Link>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default InventoryPage;
