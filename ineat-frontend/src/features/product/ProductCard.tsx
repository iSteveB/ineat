import type React from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Heart, Package, StickyNote } from 'lucide-react';

import ExpiryBadge from '@/components/common/ExpiryBadge';
import NutriScore from '@/components/common/NutriScore';
import { cn } from '@/lib/utils';
import type { InventoryItemWithStatus } from '@/schemas';
import { formatExpiryLabel } from '@/utils/dateHelpers';
import { formatQuantity } from '@/utils/ui-utils';
import { getProductImageUrl } from '@/utils/productPresentation';

interface ProductCardProps {
	item: InventoryItemWithStatus;
	isSelectionMode?: boolean;
	isSelected?: boolean;
	onToggleSelection?: () => void;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Carte produit de l'inventaire : vignette, nom, méta, péremption et Nutri-Score. */
const ProductCard: React.FC<ProductCardProps> = ({
	item,
	isSelectionMode = false,
	isSelected = false,
	onToggleSelection,
}) => {
	const meta = [
		formatQuantity(item.quantity, item.product.unitType),
		item.storageLocation ? capitalize(item.storageLocation) : null,
		item.product.brand,
	]
		.filter(Boolean)
		.join(' · ');
	const imageUrl = getProductImageUrl(item.product);

	const content = (
		<>
			{isSelectionMode && (
				<input
					type='checkbox'
					checked={isSelected}
					onChange={onToggleSelection}
					aria-label={`Sélectionner ${item.product.name}`}
					className='size-5 shrink-0 cursor-pointer accent-accent-600'
				/>
			)}

			<span className='flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-50 text-brand-800'>
				{imageUrl ? (
					<img src={imageUrl} alt='' className='size-full object-cover' />
				) : (
					<Package className='size-6' aria-hidden='true' />
				)}
			</span>

			<span className='min-w-0 flex-1'>
				<span className='flex items-center gap-1.5'>
					<span className='truncate font-medium text-neutral-900'>{item.product.name}</span>
					{item.isFavorite && (
						<Heart className='size-4 shrink-0 fill-current text-danger-600' aria-label='Favori' />
					)}
				</span>
				<span className='block truncate text-sm text-neutral-600'>{meta}</span>
				{item.notes && (
					<span className='mt-1 flex items-center gap-1 truncate text-sm text-neutral-600'>
						<StickyNote className='size-3.5 shrink-0' aria-hidden='true' />
						<span className='truncate'>{item.notes}</span>
					</span>
				)}
			</span>

			<span className='flex shrink-0 flex-col items-end gap-1.5'>
				{(item.expiryDate || item.product.category.slug === 'fruits-et-legumes') && (
					<ExpiryBadge status={item.expiryStatus}>
						{formatExpiryLabel(item.expiryDate, item.product.category.slug)}
					</ExpiryBadge>
				)}
				{item.product.nutriscore && <NutriScore score={item.product.nutriscore} size='sm' />}
			</span>

			{!isSelectionMode && (
				<ChevronRight
					className='hidden size-4 shrink-0 text-neutral-500 group-hover:text-accent-700 sm:block'
					aria-hidden='true'
				/>
			)}
		</>
	);

	const className = cn(
		'card group flex items-center gap-3 p-3 transition-[box-shadow,border-color]',
		isSelected ? 'border-accent-600 ring-2 ring-accent-600' : 'hover:shadow-md'
	);

	if (isSelectionMode) {
		return <label className={cn(className, 'cursor-pointer')}>{content}</label>;
	}

	return (
		<Link to='/app/inventory/$productId' params={{ productId: item.id }} className={className}>
			{content}
		</Link>
	);
};

export default ProductCard;
