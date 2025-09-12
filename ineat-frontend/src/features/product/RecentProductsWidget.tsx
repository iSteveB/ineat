import type { FC } from 'react';
import ProductItem from '@/features/product/ProductItem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { InventoryItem, ExpiryStatus } from '@/schemas';
import { calculateExpiryStatus } from '@/utils/dateHelpers';
import { Clock, Package } from 'lucide-react';
import { Link } from '@tanstack/react-router';

// Type étendu avec le statut d'expiration
interface InventoryItemWithStatus extends InventoryItem {
	expiryStatus: ExpiryStatus;
}

interface RecentProductsWidgetProps {
	products: InventoryItem[];
}

export const RecentProductsWidget: FC<RecentProductsWidgetProps> = ({
	products,
}) => {
	// Vérification de sécurité et filtrage des produits valides
	const validProducts = products.filter(
		(product) =>
			product && product.id && product.product && product.product.name
	);

	// Transformer les produits valides pour ajouter le statut d'expiration
	// Les données sont déjà triées et limitées à 5 par le backend
	const productsWithStatus: InventoryItemWithStatus[] = validProducts.map(
		(product) => ({
			...product,
			expiryStatus: calculateExpiryStatus(product.expiryDate || '?'),
		})
	);
	
	return (
		<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-green-50/50 shadow-xl hover:shadow-2xl transition-all duration-300'>
			{/* Effet de brillance en arrière-plan */}
			<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100/30 to-emerald-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

			<CardHeader className='pb-4'>
				<CardTitle className='flex items-center gap-3 text-gray-800'>
					<div className='p-2 rounded-xl bg-green-50 border border-green-200'>
						<Clock className='size-5 text-green-600' />
					</div>
					<div className='flex-1'>
						<h3 className='font-semibold'>Ajouts récents</h3>
						<p className='text-sm font-normal text-gray-600 mt-0.5'>
							Derniers produits ajoutés à votre inventaire
						</p>
					</div>
				</CardTitle>
			</CardHeader>

			<CardContent>
				{productsWithStatus.length > 0 ? (
					<div className='space-y-3'>
						{productsWithStatus.map((item, index) => (
							<div
								key={item.id}
								className='transform transition-all duration-300 hover:scale-[1.01]'
								style={{
									animationDelay: `${index * 100}ms`,
								}}>
								<ProductItem
									item={item}
									showNutriscore={true}
									showEcoscore={true}
									showStorage={true}
								/>
							</div>
						))}
					</div>
				) : (
					<div className='text-center py-12'>
						<div className='relative mb-4'>
							<div className='size-16 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center'>
								<Package className='size-8 text-gray-400' />
							</div>
						</div>
						<div className='space-y-2'>
							<p className='text-gray-700 font-medium'>
								Aucun produit récent
							</p>
							<p className='text-sm text-gray-500'>
								Commencez par ajouter des produits à votre
								inventaire
							</p>
							<Link
								to='/app/inventory/add'
								className='text-sm text-green-600 font-medium'>
								Ajouter un produit
							</Link>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};
