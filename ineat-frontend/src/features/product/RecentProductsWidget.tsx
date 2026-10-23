import type { FC } from 'react';
import { Link } from '@tanstack/react-router';
import { Package } from 'lucide-react';

import WidgetCard from '@/components/common/WidgetCard';
import ProductItem from '@/features/product/ProductItem';
import type { InventoryItem } from '@/schemas';
import { calculateExpiryStatus } from '@/utils/dateHelpers';

interface RecentProductsWidgetProps {
	products: InventoryItem[];
}

export const RecentProductsWidget: FC<RecentProductsWidgetProps> = ({ products }) => {
	// Les données sont déjà triées et limitées à 5 par le backend
	const productsWithStatus = products
		.filter((product) => product?.id && product.product?.name)
		.map((product) => ({
			...product,
			expiryStatus: calculateExpiryStatus(product.expiryDate),
		}));

	return (
		<WidgetCard
			title='Ajouts récents'
			action={
				productsWithStatus.length > 0 ? { label: 'Inventaire', to: '/app/inventory' } : undefined
			}>
			{productsWithStatus.length > 0 ? (
				<ul className='divide-y divide-neutral-200'>
					{productsWithStatus.map((item) => (
						<li key={item.id}>
							<ProductItem item={item} showNutriscore showEcoscore={false} showStorage />
						</li>
					))}
				</ul>
			) : (
				<div className='flex items-center gap-3 rounded-md bg-neutral-50 p-4'>
					<Package className='size-6 shrink-0 text-neutral-600' aria-hidden='true' />
					<div>
						<p className='font-medium text-neutral-900'>Aucun produit récent</p>
						<Link
							to='/app/inventory/add'
							className='rounded-sm text-sm font-medium text-accent-700 underline underline-offset-4'>
							Ajouter un produit
						</Link>
					</div>
				</div>
			)}
		</WidgetCard>
	);
};
