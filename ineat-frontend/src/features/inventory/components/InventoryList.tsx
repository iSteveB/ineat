import { useState } from 'react';
import {
	Search,
	Filter,
	Plus,
	Package2,
	AlertTriangle,
	CheckCircle,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
	useInventory,
	useInventoryStats,
	useRemoveInventoryItem,
	useInventoryFilters,
	useInventoryActions,
	InventoryFilters,
	InventoryItem,
	formatExpiryDate,
	getExpiryStatus,
	formatQuantity,
	formatPrice,
	getCategoryLabel,
	getStorageLocationLabel,
	INVENTORY_CATEGORIES,
	INVENTORY_STORAGE_LOCATIONS,
} from '@/features/inventory';

/**
 * Composant principal pour afficher la liste de l'inventaire
 */
export function InventoryListPage() {
	// État local pour la recherche
	const [searchQuery, setSearchQuery] = useState('');
	const [showFilters, setShowFilters] = useState(false);

	// État global des filtres
	const currentFilters = useInventoryFilters();
	const { setInventoryFilters, clearInventoryFilters } =
		useInventoryActions();

	// Requêtes avec nos hooks
	const {
		data: inventory = [],
		isLoading,
		error,
		refetch,
	} = useInventory(currentFilters);

	const { data: stats, isLoading: statsLoading } = useInventoryStats();

	// Mutation pour supprimer des éléments
	const removeItemMutation = useRemoveInventoryItem();

	// Filtrage par recherche textuelle (côté client)
	const filteredInventory = inventory.filter(
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
			await removeItemMutation.mutateAsync(itemId);
		}
	};

	if (error) {
		return (
			<div className='min-h-screen bg-primary-50 p-4'>
				<div className='max-w-2xl mx-auto'>
					<div className='bg-error-50 text-white p-6 rounded-xl'>
						<h2 className='text-xl font-semibold mb-2'>
							Erreur de chargement
						</h2>
						<p className='mb-4'>
							Impossible de charger votre inventaire
						</p>
						<button
							onClick={() => refetch()}
							className='bg-white text-error-50 px-4 py-2 rounded-lg font-medium'>
							Réessayer
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-primary-50'>
			{/* Header */}
			<div className='bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10'>
				<div className='p-4'>
					<div className='flex items-center justify-between mb-4'>
						<h1 className='text-2xl font-bold text-neutral-900'>
							Mon Inventaire
						</h1>
						<Link
							to='/app/inventory/add-product'
							className='bg-success-50 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-success-50/80 transition-colors'>
							<Plus className='size-4' />
							Ajouter
						</Link>
					</div>

					{/* Statistiques rapides */}
					{stats && !statsLoading && (
						<div className='grid grid-cols-3 gap-4 mb-4'>
							<div className='bg-white p-3 rounded-lg border border-neutral-200'>
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

							<div className='bg-white p-3 rounded-lg border border-neutral-200'>
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

							<div className='bg-white p-3 rounded-lg border border-neutral-200'>
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
					)}

					{/* Barre de recherche */}
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

					{/* Bouton filtres */}
					<button
						onClick={() => setShowFilters(!showFilters)}
						className='flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors'>
						<Filter className='size-4' />
						Filtres
						{(currentFilters.category ||
							currentFilters.storageLocation ||
							currentFilters.expiringWithinDays) && (
							<span className='bg-accent text-white text-xs px-2 py-1 rounded-full'>
								Actifs
							</span>
						)}
					</button>
				</div>

				{/* Panneau de filtres */}
				{showFilters && (
					<div className='bg-white border-t border-neutral-200 p-4'>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
							{/* Filtre par catégorie */}
							<div>
								<label className='block text-sm font-medium text-neutral-700 mb-2'>
									Catégorie
								</label>
								<select
									value={currentFilters.category || ''}
									onChange={(e) =>
										handleFilterChange({
											category:
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

			{/* Liste des produits */}
			<div className='p-4'>
				{isLoading ? (
					<div className='flex justify-center items-center py-12'>
						<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-success-50'></div>
					</div>
				) : filteredInventory.length === 0 ? (
					<div className='text-center py-12'>
						<Package2 className='size-12 text-neutral-400 mx-auto mb-4' />
						<h3 className='text-lg font-medium text-neutral-900 mb-2'>
							{inventory.length === 0
								? 'Aucun produit dans votre inventaire'
								: 'Aucun produit trouvé'}
						</h3>
						<p className='text-neutral-600 mb-6'>
							{inventory.length === 0
								? 'Commencez par ajouter vos premiers produits'
								: 'Essayez de modifier vos critères de recherche'}
						</p>
						{inventory.length === 0 && (
							<Link
								to='/app/inventory/add-product'
								className='bg-success-50 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2 hover:bg-success-50/80 transition-colors'>
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
								isRemoving={removeItemMutation.isPending}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * Composant pour afficher un élément d'inventaire
 */
interface InventoryItemCardProps {
	item: InventoryItem;
	onRemove: () => void;
	isRemoving: boolean;
}

function InventoryItemCard({
	item,
	onRemove,
	isRemoving,
}: InventoryItemCardProps) {
	const expiryStatus = getExpiryStatus(item.expiryDate);

	const statusColors = {
		fresh: 'border-l-success-50',
		warning: 'border-l-warning-50',
		danger: 'border-l-error-50',
		expired: 'border-l-error-100',
	};

	return (
		<div
			className={`bg-white border-l-4 ${statusColors[expiryStatus]} rounded-lg p-4 shadow-sm`}>
			<div className='flex items-start justify-between'>
				<div className='flex-1'>
					<div className='flex items-start gap-3'>
						{/* Image placeholder */}
						<div className='size-12 bg-neutral-100 rounded-lg flex items-center justify-center'>
							<Package2 className='size-6 text-neutral-400' />
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
						</div>
					</div>

					{/* Informations d'expiration */}
					<div className='mt-3 flex items-center justify-between'>
						<div className='text-sm'>
							<span
								className={`font-medium ${
									expiryStatus === 'expired'
										? 'text-error-100'
										: expiryStatus === 'danger'
										? 'text-error-50'
										: expiryStatus === 'warning'
										? 'text-warning-50'
										: 'text-success-50'
								}`}>
								{formatExpiryDate(item.expiryDate)}
							</span>
						</div>

						{item.purchasePrice && (
							<div className='text-sm text-neutral-600'>
								{formatPrice(item.purchasePrice)}
							</div>
						)}
					</div>
				</div>

				{/* Actions */}
				<div className='flex items-center gap-2 ml-4'>
					<Link
						to='/app/inventory/$itemId'
						params={{ itemId: item.id }}
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
