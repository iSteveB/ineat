import type { FC } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Package } from 'lucide-react';

import ExpiryBadge from '@/components/common/ExpiryBadge';
import NutriScore from '@/components/common/NutriScore';
import ScoreBadge from '@/components/common/ScoreBadge';
import type { ExpiryStatus, InventoryItem } from '@/schemas';
import { formatExpiryLabel } from '@/utils/dateHelpers';

interface InventoryItemWithStatus extends InventoryItem {
	expiryStatus: ExpiryStatus;
}

interface ProductItemProps {
	item: InventoryItemWithStatus;
	showNutriscore?: boolean;
	showEcoscore?: boolean;
	showStorage?: boolean;
}

const formatQuantity = ({ quantity, product }: InventoryItem): string => {
	switch (product.unitType) {
		case 'UNIT':
			return quantity === 1 ? '1 unité' : `${quantity} unités`;
		case 'KG':
			return `${quantity} kg`;
		case 'G':
			return `${quantity} g`;
		case 'L':
			return `${quantity} L`;
		case 'ML':
			return `${quantity} mL`;
		default:
			return `${quantity} ${String(product.unitType).toLowerCase()}`;
	}
};

/** Ligne de produit du design system : vignette, nom, méta, pastille de péremption et scores. */
const ProductItem: FC<ProductItemProps> = ({
	item,
	showNutriscore = true,
	showEcoscore = true,
	showStorage = true,
}) => {
	const meta = [
		formatQuantity(item),
		showStorage ? item.storageLocation : null,
		item.product.brand,
	]
		.filter(Boolean)
		.join(' · ');
	const isEstimated = item.expiryDateSource === 'ESTIMATED';

	return (
		<Link
			to='/app/inventory/$productId'
			params={{ productId: item.id }}
			className='group flex items-center gap-3 rounded-md py-3 transition-colors hover:bg-neutral-50 sm:px-2'>
			<span className='flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-50 text-brand-800'>
				{item.product.imageUrl ? (
					<img src={item.product.imageUrl} alt='' className='size-full object-cover' />
				) : (
					<Package className='size-5' aria-hidden='true' />
				)}
			</span>

			<span className='min-w-0 flex-1'>
				<span className='block truncate font-medium text-neutral-900'>{item.product.name}</span>
				<span className='block truncate text-sm text-neutral-600'>{meta}</span>
			</span>

			<span className='flex shrink-0 flex-col items-end gap-1.5'>
				<ExpiryBadge status={item.expiryStatus}>
					{formatExpiryLabel(item.expiryDate)}
					{isEstimated && <span className='sr-only'> (date estimée)</span>}
				</ExpiryBadge>
				{isEstimated && (
					<span aria-hidden='true' className='text-xs text-neutral-600'>
						Date estimée
					</span>
				)}
				{(showNutriscore || showEcoscore) && (
					<span className='flex items-center gap-1.5'>
						{showNutriscore && item.product.nutriscore && (
							<NutriScore score={item.product.nutriscore} size='sm' />
						)}
						{showEcoscore && item.product.ecoscore && (
							<ScoreBadge type='eco' score={item.product.ecoscore} size='sm' />
						)}
					</span>
				)}
			</span>

			<ChevronRight
				className='hidden size-4 shrink-0 text-neutral-500 group-hover:text-accent-700 sm:block'
				aria-hidden='true'
			/>
		</Link>
	);
};

export default ProductItem;
