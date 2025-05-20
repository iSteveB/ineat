import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Search, Plus, Menu } from 'lucide-react';
import { useInventoryStore } from '@/stores/inventoryStore';
import ProductCard from '@/components/common/ProductCard';
import CategoryFilter from '@/components/common/CategoryFilter';
import { StorageLocation } from '@/types';

export const Route = createFileRoute('/app/inventory/')({
	component: InventoryPage,
});

function InventoryPage() {
	// État local pour la recherche et le filtre
	const [searchQuery, setSearchQuery] = useState('');
	const [activeCategory, setActiveCategory] = useState<StorageLocation>('ALL');

	// Récupération des données avec Zustand
	const { items, fetchInventoryItems, isLoading } = useInventoryStore();

	// Charger les données au montage du composant
	useEffect(() => {
		fetchInventoryItems();
	}, [fetchInventoryItems]);

	// Filtrer les éléments en fonction de la recherche et de la catégorie
	const filteredItems = items.filter((item) => {
		const matchesSearch =
			item.product.name
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			item.product.brand
				.toLowerCase()
				.includes(searchQuery.toLowerCase());

		const matchesCategory =
			activeCategory === 'ALL' ||
			(activeCategory === 'FRESH' &&
				item.storageLocation.includes('Frigo')) ||
			(activeCategory === 'FREEZER' &&
				item.storageLocation.includes('Congélateur')) ||
			(activeCategory === 'PANTRY' &&
				(item.storageLocation.includes('Placard') ||
					item.storageLocation.includes('Cellier')));

		return matchesSearch && matchesCategory;
	});

	return (
		<div className='flex flex-col h-full bg-primary-50 lg:max-w-2/3 2xl:max-w-1/2 lg:m-auto'>
			{/* En-tête avec avatar et titre */}
			<div className='px-4 py-6 flex items-center gap-4'>
				<div className='size-16 rounded-full bg-primary-100 overflow-hidden'>
					<img
						src='/avatar.png'
						alt='Avatar utilisateur'
						className='size-full object-cover'
					/>
				</div>
				<h1 className='text-3xl font-bold font-display'>Mes Stocks</h1>
				<div className='ml-auto'>
					<button className='p-2 rounded-full bg-neutral-100 shadow-sm'>
						<Menu size={24} />
					</button>
				</div>
			</div>

			{/* Barre de recherche */}
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

			{/* Filtres par catégorie */}
			<div className='px-4 mb-4 mx-auto'>
				<CategoryFilter
					activeCategory={activeCategory}
					onCategoryChange={setActiveCategory}
				/>
			</div>

			{/* Liste des produits */}
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

			{/* Bouton d'ajout flottant */}
			<div className='fixed bottom-20 right-4 z-10'>
				<button
					className='size-14 rounded-full bg-accent flex items-center justify-center shadow-lg text-neutral-50 hover:bg-success-50 transition-colors'
					onClick={() =>
						(window.location.href = '/app/inventory/add-product')
					}>
					<Plus size={24} />
				</button>
			</div>
		</div>
	);
}

export default InventoryPage;
