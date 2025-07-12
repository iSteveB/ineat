import { FC } from 'react';
import ProductItem from '@/components/common/ProductItem';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardItemList,
} from '@/components/ui/card';
import { InventoryItem, ExpiryStatus } from '@/schemas';
import { calculateExpiryStatus } from '@/utils/dateHelpers';

// Type étendu avec le statut d'expiration
interface InventoryItemWithStatus extends InventoryItem {
	expiryStatus: ExpiryStatus;
}

interface ExpiringProductsWidgetProps {
	products: InventoryItem[];
}

export const ExpiringProductsWidget: FC<ExpiringProductsWidgetProps> = ({
	products,
}) => {
	// Vérification de sécurité et filtrage des produits valides
	const validProducts = products.filter(
		(product) =>
			product && product.id && product.product && product.product.name
	);

	// Transformer les produits valides pour ajouter le statut d'expiration
	const productsWithStatus: InventoryItemWithStatus[] = validProducts.map(
		(product) => ({
			...product,
			expiryStatus: calculateExpiryStatus(product.expiryDate || '?'),
		})
	);

	return (
		<Card className='bg-neutral-50'>
			<CardHeader>
				<CardTitle>Expirent bientôt</CardTitle>
			</CardHeader>

			<CardContent>
				<CardItemList>
					{productsWithStatus.length > 0 ? (
						productsWithStatus.map((item) => (
							<ProductItem
								key={item.id}
								item={item}
								showNutriscore={false}
								showEcoscore={false}
								showStorage={false}
							/>
						))
					) : (
						<p className='text-neutral-200 text-center'>
							Tous vos produits sont loin de leur date de
							péremption
						</p>
					)}
				</CardItemList>
			</CardContent>
		</Card>
	);
};