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

	// Log pour debug si certains produits sont invalides
	if (products.length !== validProducts.length) {
		console.warn(
			`RecentProductsWidget: ${
				products.length - validProducts.length
			} produits invalides filtrés`
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Ajouts récents</CardTitle>
			</CardHeader>

			<CardContent>
				<CardItemList>
					{productsWithStatus.length > 0 ? (
						productsWithStatus.map((item) => (
							<ProductItem
								key={item.id}
								item={item}
								showNutriscore={true}
								showEcoscore={true}
								showStorage={true}
							/>
						))
					) : (
						<p className='text-neutral-200 text-center'>
							Aucun produit récent
						</p>
					)}
				</CardItemList>
			</CardContent>
		</Card>
	);
};
