import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useInventoryStore } from '@/stores/inventoryStore';
import { StorageLocation, ProductWithExpiryStatus } from '@/types/product';
import { calculateExpiryStatus } from '@/types/common';
import ProductCard from '@/components/common/ProductCard';
import CategoryFilter from '@/components/common/CategoryFilter';

const InventoryPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
	const [activeCategory, setActiveCategory] =
		useState<StorageLocation>('ALL');

	const { items, fetchInventoryItems, isLoading } = useInventoryStore();

	// Charger les données au montage du composant
	useEffect(() => {
		fetchInventoryItems();
	}, [fetchInventoryItems]);

	const enrichedItems: ProductWithExpiryStatus[] = items.map((item) => ({
		...item,
		expiryStatus: calculateExpiryStatus(item.expiryDate),
	}));

	const filteredItems = enrichedItems.filter((item) => {
		const matchesSearch =
			item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			item.brand.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesCategory =
			activeCategory === 'ALL' || item.storageLocation === activeCategory;

		return matchesSearch && matchesCategory;
	});

	return (
		<div className='flex flex-col h-full bg-primary-50'>
			<div className='px-4 py-6 flex items-center gap-4'>
				<div className='size-16 rounded-full bg-primary-100 overflow-hidden'>
					<img
						src='/avatar.png'
						alt='Avatar utilisateur'
						className='size-full object-cover'
					/>
				</div>
				<h1 className='text-3xl font-bold font-display'>Mes Stocks</h1>
			</div>

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

			<div className='px-4 mb-4'>
				<CategoryFilter
					activeCategory={activeCategory}
					onCategoryChange={setActiveCategory}
				/>
			</div>

			<div className='flex-1 px-4 pb-20 overflow-auto'>
				{isLoading ? (
					<div className='flex justify-center items-center h-40'>
						<div className='animate-spin rounded-full size-8 border-b-2 border-accent'></div>
					</div>
				) : filteredItems.length > 0 ? (
					<div className='space-y-4'>
						{filteredItems.map((item) => (
							<ProductCard key={item.id} item={item} />
						))}
					</div>
				) : (
					<div className='flex flex-col items-center justify-center h-40 text-center'>
						<p className='text-neutral-200 mb-2'>
							Aucun produit trouvé
						</p>
						<p className='text-sm text-neutral-200'>
							Ajoutez des produits ou modifiez vos critères de
							recherche
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default InventoryPage;