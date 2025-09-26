import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import {
	Search,
	Filter,
	Plus,
	Package2,
	AlertTriangle,
	CheckCircle,
} from 'lucide-react';

// ===== IMPORTS SCHÉMAS ZOD =====
import { InventoryItemWithStatus, InventoryFilters } from '@/schemas';

// ===== IMPORTS STORE =====
import {
	useInventoryItems,
	useInventoryLoading,
	useInventoryError,
	useInventoryActions,
	useInventoryFilters,
} from '@/stores/inventoryStore';

// ===== IMPORTS UTILITAIRES UI =====
import {
	formatRelativeDate,
	formatQuantity,
	formatPrice,
	getExpiryStatusTextColor,
} from '@/utils/ui-utils';

// ===== CONSTANTES =====
const INVENTORY_CATEGORIES = [
	{ value: 'fruits-legumes', label: 'Fruits et légumes' },
	{ value: 'viandes-poissons', label: 'Viandes et poissons' },
	{ value: 'produits-laitiers', label: 'Produits laitiers' },
	{ value: 'cereales-feculents', label: 'Céréales et féculents' },
	{ value: 'epicerie-salee', label: 'Épicerie salée' },
	{ value: 'epicerie-sucree', label: 'Épicerie sucrée' },
	{ value: 'boissons', label: 'Boissons' },
	{ value: 'surgeles', label: 'Surgelés' },
	{ value: 'autres', label: 'Autres' },
] as const;

const INVENTORY_STORAGE_LOCATIONS = [
	{ value: 'refrigerator', label: 'Réfrigérateur' },
	{ value: 'freezer', label: 'Congélateur' },
	{ value: 'pantry', label: 'Placard' },
	{ value: 'cellar', label: 'Cave' },
	{ value: 'garage', label: 'Garage' },
	{ value: 'other', label: 'Autre' },
] as const;

// ===== UTILITAIRES =====
const getCategoryLabel = (slug: string): string => {
	const category = INVENTORY_CATEGORIES.find((cat) => cat.value === slug);
	return category?.label || slug;
};

const getStorageLocationLabel = (location: string): string => {
	const storageLocation = INVENTORY_STORAGE_LOCATIONS.find(
		(loc) => loc.value === location
	);
	return storageLocation?.label || location;
};

// ===== COMPOSANT PRINCIPAL =====
export function InventoryListPage() {
	// ===== ÉTAT LOCAL =====
	const [searchQuery, setSearchQuery] = useState('');
	const [showFilters, setShowFilters] = useState(false);

	// ===== STORE INVENTORY =====
	const items = useInventoryItems();
	const isLoading = useInventoryLoading();
	const error = useInventoryError();
	const currentFilters = useInventoryFilters();
	const {
		fetchInventoryItems,
		setInventoryFilters,
		clearInventoryFilters,
		removeInventoryItem,
		clearError,
	} = useInventoryActions();

	// ===== EFFECTS =====
	useEffect(() => {
		fetchInventoryItems();
	}, [fetchInventoryItems]);

	useEffect(() => {
		if (error) {
			console.error('Erreur inventaire:', error);
		}
	}, [error]);

	// ===== LOGIQUE DE FILTRAGE =====

	// Filtrage par recherche textuelle (côté client)
	const filteredInventory = items.filter(
		(item) =>
			item.product.name
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			(item.product.brand &&
				item.product.brand
					.toLowerCase()
					.includes(searchQuery.toLowerCase()))
	);

	// Gestion des filtres
	const handleFilterChange = (newFilters: Partial<InventoryFilters>) => {
		setInventoryFilters({ ...currentFilters, ...newFilters });
	};

	const clearAllFilters = () => {
		clearInventoryFilters();
		setSearchQuery('');
	};

	const handleRemoveItem = async (itemId: string) => {
		if (
			window.confirm(
				'Êtes-vous sûr de vouloir supprimer ce produit de votre inventaire ?'
			)
		) {
			try {
				await removeInventoryItem(itemId);
			} catch (error) {
				console.error('Erreur lors de la suppression:', error);
			}
		}
	};

	// ===== CALCULS DE STATISTIQUES =====
	const stats = {
		totalItems: items.length,
		expiringInWeek: items.filter(
			(item) =>
				item.expiryStatus === 'CRITICAL' ||
				item.expiryStatus === 'WARNING'
		).length,
		totalValue: items.reduce(
			(sum, item) => sum + (item.purchasePrice || 0),
			0
		),
	};

	// ===== GESTION DES ERREURS =====
	if (error) {
		return (
			<div className='min-h-screen bg-primary-50 p-4'>
				<div className='max-w-2xl mx-auto'>
					<div className='bg-error-50 text-neutral-50 p-6 rounded-xl'>
						<h2 className='text-xl font-semibold mb-2'>
							Erreur de chargement
						</h2>
						<p className='mb-4'>
							Impossible de charger votre inventaire: {error}
						</p>
						<div className='flex gap-2'>
							<button
								onClick={() => fetchInventoryItems()}
								className='bg-neutral-50 text-error-50 px-4 py-2 rounded-lg font-medium'>
								Réessayer
							</button>
							<button
								onClick={clearError}
								className='bg-neutral-50/20 text-neutral-50 px-4 py-2 rounded-lg font-medium'>
								Fermer
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-primary-50'>
			{/* ===== HEADER ===== */}
			<div className='bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10'>
				<div className='p-4'>
					<div className='flex items-center justify-between mb-4'>
						<h1 className='text-2xl font-bold text-neutral-900'>
							Mon Inventaire
						</h1>
						<Link
							to='/app/inventory/add'
							className='bg-success-50 text-neutral-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-success-50/80 transition-colors'>
							<Plus className='size-4' />
							Ajouter
						</Link>
					</div>

					{/* ===== STATISTIQUES RAPIDES ===== */}
					<div className='grid grid-cols-3 gap-4 mb-4'>
						<div className='bg-neutral-50 p-3 rounded-lg border border-neutral-200'>
							<div className='flex items-center gap-2'>
								<Package2 className='size-4 text-success-50' />
								<span className='text-sm text-neutral-600'>
									Total
								</span>
							</div>
							<p className='text-lg font-semibold text-neutral-900'>
								{stats.totalItems}
							</p>
						</div>

						<div className='bg-neutral-50 p-3 rounded-lg border border-neutral-200'>
							<div className='flex items-center gap-2'>
								<AlertTriangle className='size-4 text-warning-50' />
								<span className='text-sm text-neutral-600'>
									À consommer
								</span>
							</div>
							<p className='text-lg font-semibold text-neutral-900'>
								{stats.expiringInWeek}
							</p>
						</div>

						<div className='bg-neutral-50 p-3 rounded-lg border border-neutral-200'>
							<div className='flex items-center gap-2'>
								<CheckCircle className='size-4 text-success-50' />
								<span className='text-sm text-neutral-600'>
									Valeur
								</span>
							</div>
							<p className='text-lg font-semibold text-neutral-900'>
								{formatPrice(stats.totalValue)}
							</p>
						</div>
					</div>

					{/* ===== BARRE DE RECHERCHE ===== */}
					<div className='relative mb-4'>
						<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-neutral-400' />
						<input
							type='text'
							placeholder='Rechercher un produit...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent'
						/>
					</div>

					{/* ===== BOUTON FILTRES ===== */}
					<button
						onClick={() => setShowFilters(!showFilters)}
						className='flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors'>
						<Filter className='size-4' />
						Filtres
						{(currentFilters.categoryId ||
							currentFilters.storageLocation ||
							currentFilters.expiringWithinDays) && (
							<span className='bg-accent text-neutral-50 text-xs px-2 py-1 rounded-full'>
								Actifs
							</span>
						)}
					</button>
				</div>

				{/* ===== PANNEAU DE FILTRES ===== */}
				{showFilters && (
					<div className='bg-neutral-50 border-t border-neutral-200 p-4'>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
							{/* Filtre par catégorie */}
							<div>
								<label className='block text-sm font-medium text-neutral-700 mb-2'>
									Catégorie
								</label>
								<select
									value={currentFilters.categoryId || ''}
									onChange={(e) =>
										handleFilterChange({
											categoryId:
												e.target.value || undefined,
										})
									}
									className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent'>
									<option value=''>
										Toutes les catégories
									</option>
									{INVENTORY_CATEGORIES.map((cat) => (
										<option
											key={cat.value}
											value={cat.value}>
											{cat.label}
										</option>
									))}
								</select>
							</div>

							{/* Filtre par lieu de stockage */}
							<div>
								<label className='block text-sm font-medium text-neutral-700 mb-2'>
									Lieu de stockage
								</label>
								<select
									value={currentFilters.storageLocation || ''}
									onChange={(e) =>
										handleFilterChange({
											storageLocation:
												e.target.value || undefined,
										})
									}
									className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent'>
									<option value=''>Tous les lieux</option>
									{INVENTORY_STORAGE_LOCATIONS.map((loc) => (
										<option
											key={loc.value}
											value={loc.value}>
											{loc.label}
										</option>
									))}
								</select>
							</div>

							{/* Filtre par expiration */}
							<div>
								<label className='block text-sm font-medium text-neutral-700 mb-2'>
									Expire dans
								</label>
								<select
									value={
										currentFilters.expiringWithinDays?.toString() ||
										''
									}
									onChange={(e) =>
										handleFilterChange({
											expiringWithinDays: e.target.value
												? parseInt(e.target.value)
												: undefined,
										})
									}
									className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent'>
									<option value=''>Toutes les dates</option>
									<option value='1'>1 jour</option>
									<option value='3'>3 jours</option>
									<option value='7'>1 semaine</option>
									<option value='30'>1 mois</option>
								</select>
							</div>
						</div>

						<div className='flex justify-end mt-4'>
							<button
								onClick={clearAllFilters}
								className='text-neutral-600 hover:text-neutral-900 transition-colors'>
								Effacer tous les filtres
							</button>
						</div>
					</div>
				)}
			</div>

			{/* ===== LISTE DES PRODUITS ===== */}
			<div className='p-4'>
				{isLoading ? (
					<div className='flex justify-center items-center py-12'>
						<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-success-50'></div>
					</div>
				) : filteredInventory.length === 0 ? (
					<div className='text-center py-12'>
						<Package2 className='size-12 text-neutral-400 mx-auto mb-4' />
						<h3 className='text-lg font-medium text-neutral-900 mb-2'>
							{items.length === 0
								? 'Aucun produit dans votre inventaire'
								: 'Aucun produit trouvé'}
						</h3>
						<p className='text-neutral-600 mb-6'>
							{items.length === 0
								? 'Commencez par ajouter vos premiers produits'
								: 'Essayez de modifier vos critères de recherche'}
						</p>
						{items.length === 0 && (
							<Link
								to='/app/inventory/add'
								className='bg-success-50 text-neutral-50 px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2 hover:bg-success-50/80 transition-colors'>
								<Plus className='size-4' />
								Ajouter mon premier produit
							</Link>
						)}
					</div>
				) : (
					<div className='space-y-3'>
						{filteredInventory.map((item) => (
							<InventoryItemCard
								key={item.id}
								item={item}
								onRemove={() => handleRemoveItem(item.id)}
								isRemoving={isLoading}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// ===== COMPOSANT CARTE D'ITEM =====
interface InventoryItemCardProps {
	item: InventoryItemWithStatus;
	onRemove: () => void;
	isRemoving: boolean;
}

function InventoryItemCard({
	item,
	onRemove,
	isRemoving,
}: InventoryItemCardProps) {
	const expiryStatus = item.expiryStatus;

	const statusColors = {
		GOOD: 'border-l-success-50',
		WARNING: 'border-l-warning-50',
		CRITICAL: 'border-l-error-50',
		EXPIRED: 'border-l-error-100',
		UNKNOWN: 'border-l-neutral-200',
	};

	return (
		<div
			className={`bg-neutral-50 border-l-4 ${statusColors[expiryStatus]} rounded-lg p-4 shadow-sm`}>
			<div className='flex items-start justify-between'>
				<div className='flex-1'>
					<div className='flex items-start gap-3'>
						{/* ===== IMAGE DU PRODUIT ===== */}
						<div className='size-12 bg-neutral-100 rounded-lg flex items-center justify-center overflow-hidden'>
							{item.product.imageUrl ? (
								<img
									src={item.product.imageUrl}
									alt={item.product.name}
									className='size-full object-cover'
								/>
							) : (
								<Package2 className='size-6 text-neutral-400' />
							)}
						</div>

						<div className='flex-1'>
							<h3 className='font-medium text-neutral-900'>
								{item.product.name}
								{item.product.brand && (
									<span className='text-neutral-600 font-normal ml-2'>
										- {item.product.brand}
									</span>
								)}
							</h3>

							<div className='text-sm text-neutral-600 space-y-1'>
								<p>
									{formatQuantity(
										item.quantity,
										item.product.unitType
									)}
								</p>
								<p>
									{getCategoryLabel(
										item.product.category.slug
									)}
								</p>
								{item.storageLocation && (
									<p>
										{getStorageLocationLabel(
											item.storageLocation
										)}
									</p>
								)}
							</div>

							{/* ===== SCORES NUTRITIONNELS ===== */}
							<div className='flex gap-2 mt-2'>
								{item.product.nutriscore && (
									<span className='text-xs px-2 py-1 bg-nutriscore-a text-neutral-50 rounded'>
										Nutriscore {item.product.nutriscore}
									</span>
								)}
								{item.product.ecoscore && (
									<span className='text-xs px-2 py-1 bg-success-50 text-neutral-50 rounded'>
										Eco {item.product.ecoscore}
									</span>
								)}
							</div>
						</div>
					</div>

					{/* ===== INFORMATIONS D'EXPIRATION ===== */}
					<div className='mt-3 flex items-center justify-between'>
						<div className='text-sm'>
							{item.expiryDate && (
								<span
									className={`font-medium ${getExpiryStatusTextColor(
										expiryStatus
									)}`}>
									{formatRelativeDate(item.expiryDate)}
								</span>
							)}
						</div>

						{item.purchasePrice && (
							<div className='text-sm text-neutral-600'>
								{formatPrice(item.purchasePrice)}
							</div>
						)}
					</div>
				</div>

				{/* ===== ACTIONS ===== */}
				<div className='flex items-center gap-2 ml-4'>
					<Link
						to='/app/inventory/$productId'
						params={{ productId: item.id }}
						className='text-neutral-600 hover:text-neutral-900 transition-colors p-2'>
						Détails
					</Link>
					<button
						onClick={onRemove}
						disabled={isRemoving}
						className='text-error-50 hover:text-error-100 transition-colors p-2 disabled:opacity-50'>
						{isRemoving ? 'Suppression...' : 'Supprimer'}
					</button>
				</div>
			</div>
		</div>
	);
}
