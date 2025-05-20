import { ProductWithExpiryStatus } from '@/types';
import { FC } from 'react';
import ProductItem from '@/components/common/ProductItem';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardItemList,
} from '@/components/ui/card';

interface ExpiringProductsWidgetProps {
	products: ProductWithExpiryStatus[];
}

export const ExpiringProductsWidget: FC<ExpiringProductsWidgetProps> = ({
	products,
}) => {
	return (
		<Card className='bg-neutral-50'>
			<CardHeader>
				<CardTitle>Expirent bientôt</CardTitle>
			</CardHeader>

			<CardContent>
				<CardItemList>
					{products.length > 0 ? (
						products.map((product) => (
							<ProductItem
								key={product.id}
								product={product}
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
