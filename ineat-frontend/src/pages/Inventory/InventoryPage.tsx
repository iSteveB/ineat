import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import {
	useInventoryItems,
	useInventoryLoading,
	useInventoryError,
	useInventoryActions,
} from '@/stores/inventoryStore';
import { InventoryItemResponse } from '@/services/inventoryService';
import { calculateExpiryStatus, ExpiryStatus } from '@/utils/dateHelpers';
import ProductCard from '@/components/common/ProductCard';
import CategoryFilter from '@/components/common/CategoryFilter';
import { StorageLocation } from '@/types/product';
import { Link } from '@tanstack/react-router';

// Type enrichi avec le statut d'expiration
interface InventoryItemWithStatus extends InventoryItemResponse {
	expiryStatus: ExpiryStatus;
}

// Mapping entre les catégories d'affichage et les lieux de stockage réels
const CATEGORY_TO_STORAGE_MAPPING: Record<StorageLocation, string[]> = {
	'ALL': [],
	'FRESH': ['refrigerator', 'fridge', 'frigo', 'réfrigérateur'],
	'FREEZER': ['freezer', 'congélateur', 'congelateur'],
	'PANTRY': ['pantry', 'placard', 'cupboard', 'épicerie', 'epicerie', 'other'],
};

const InventoryPage: React.FC = () => {
	const [searchQuery, setSearchQuery] = useState('');
	const [activeCategory, setActiveCategory] = useState<StorageLocation>('ALL');

	// Récupération des données depuis le store
	const items = useInventoryItems();
	const isLoading = useInventoryLoading();
	const error = useInventoryError();
	const { fetchInventoryItems, clearError } = useInventoryActions();

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

	// Enrichir les items avec le statut d'expiration
	const enrichedItems: InventoryItemWithStatus[] = items.map((item) => ({
		...item,
		expiryStatus: calculateExpiryStatus(item.expiryDate),
	}));

	// Filtrer les items selon la recherche et la catégorie
	const filteredItems = enrichedItems.filter((item) => {
		// Recherche dans le nom et la marque du produit
		const matchesSearch =
			item.product.name
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			(item.product.brand &&
				item.product.brand
					.toLowerCase()
					.includes(searchQuery.toLowerCase()));

		// Filtrage par catégorie
		let matchesCategory = false;
		
		if (activeCategory === 'ALL') {
			matchesCategory = true;
		} else if (item.storageLocation) {
			const storageLocations = CATEGORY_TO_STORAGE_MAPPING[activeCategory];
			matchesCategory = storageLocations.some(location => 
				item.storageLocation?.toLowerCase().includes(location)
			);
		} else {
			// Si pas de lieu de stockage défini, on considère que c'est dans le placard (PANTRY)
			matchesCategory = activeCategory === 'PANTRY';
		}

		return matchesSearch && matchesCategory;
	});

	// Trier par date d'expiration (les plus proches en premier)
	const sortedItems = [...filteredItems].sort((a, b) => {
		if (!a.expiryDate) return 1;
		if (!b.expiryDate) return -1;
		return (
			new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
		);
	});

	return (
		<div className='flex flex-col h-full bg-primary-50'>
			<div className='px-4 py-6 flex items-center gap-4'>
				<div className='size-16 rounded-full bg-primary-100 overflow-hidden'>
					<img
						src='https://i.pravatar.cc/300'
						alt='Avatar utilisateur'
						className='size-full object-cover'
					/>
				</div>
				<h1 className='text-3xl font-bold font-display'>
					Mon Inventaire
				</h1>
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
				) : sortedItems.length > 0 ? (
					<div className='space-y-4'>
						{sortedItems.map((item) => (
							<ProductCard key={item.id} item={item} />
						))}
					</div>
				) : (
					<div className='flex flex-col items-center justify-center h-40 text-center'>
						<p className='text-neutral-200 mb-2'>
							{searchQuery || activeCategory !== 'ALL'
								? 'Aucun produit trouvé'
								: 'Votre inventaire est vide'}
						</p>
						<p className='text-sm text-neutral-200'>
							{searchQuery || activeCategory !== 'ALL'
								? 'Modifiez vos critères de recherche'
								: 'Commencez par ajouter des produits'}
						</p>
						<Link
							to='/app/inventory/add-product'
							className='mt-4 px-6 py-2 rounded-full bg-accent text-neutral-50 font-medium hover:bg-accent-600 transition-colors'>
							Ajouter un produit
						</Link>
					</div>
				)}
			</div>
		</div>
	);
};

export default InventoryPage;