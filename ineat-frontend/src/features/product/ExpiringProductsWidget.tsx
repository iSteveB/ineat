import type { FC } from 'react';
import { ShieldCheck } from 'lucide-react';

import WidgetCard from '@/components/common/WidgetCard';
import ProductItem from '@/features/product/ProductItem';
import type { ExpiryStatus, InventoryItem } from '@/schemas';
import { calculateExpiryStatus } from '@/utils/dateHelpers';

interface ExpiringProductsWidgetProps {
	products: InventoryItem[];
}

const getSubtitle = (statuses: ExpiryStatus[]): string => {
	if (statuses.includes('EXPIRED')) return 'Certains produits sont périmés : vérifiez-les.';
	if (statuses.includes('CRITICAL')) return 'À consommer en priorité.';
	if (statuses.includes('WARNING')) return 'À prévoir dans vos prochains repas.';
	return 'Aucune urgence pour le moment.';
};

export const ExpiringProductsWidget: FC<ExpiringProductsWidgetProps> = ({ products }) => {
	const productsWithStatus = products
		.filter((product) => product?.id && product.product?.name)
		.map((product) => ({
			...product,
			expiryStatus: calculateExpiryStatus(product.expiryDate),
		}));

	return (
		<WidgetCard
			title='À consommer bientôt'
			subtitle={
				productsWithStatus.length > 0
					? getSubtitle(productsWithStatus.map((product) => product.expiryStatus))
					: undefined
			}
			action={
				productsWithStatus.length > 0 ? { label: 'Tout voir', to: '/app/inventory' } : undefined
			}>
			{productsWithStatus.length > 0 ? (
				<ul className='divide-y divide-neutral-200'>
					{productsWithStatus.map((item) => (
						<li key={item.id}>
							<ProductItem
								item={item}
								showNutriscore={false}
								showEcoscore={false}
								showStorage
							/>
						</li>
					))}
				</ul>
			) : (
				<div className='flex items-center gap-3 rounded-md bg-success-50 p-4 text-success-700'>
					<ShieldCheck className='size-6 shrink-0' aria-hidden='true' />
					<div>
						<p className='font-medium'>Tous vos produits sont frais</p>
						<p className='text-sm text-neutral-700'>
							Aucun produit n'expire dans les 7 prochains jours.
						</p>
					</div>
				</div>
			)}
		</WidgetCard>
	);
};
