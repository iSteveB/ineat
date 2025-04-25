import { Product } from '@/types/types';
import { FC } from 'react';
import ProductItem from '@/components/common/ProductItem';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardItemList,
} from '@/components/ui/card';

interface RecentProductsWidgetProps {
	products: Product[];
}

export const RecentProductsWidget: FC<RecentProductsWidgetProps> = ({
	products,
}) => {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Ajouts récents</CardTitle>
			</CardHeader>

			<CardContent>
				<CardItemList>
					{products.length > 0 ? (
						products.map((product) => (
							<ProductItem
								key={product.id}
								product={product}
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
