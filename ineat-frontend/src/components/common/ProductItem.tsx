import { FC } from 'react';
import { Product, ProductWithExpiryStatus } from '@/types';
import {
	getNutriscoreColor,
	formatRelativeDate,
	calculateExpiryStatus,
} from '@/utils/utils';
import { Link } from '@tanstack/react-router';

interface ProductItemProps {
	product: Product | ProductWithExpiryStatus;
	showNutriscore?: boolean;
	showEcoscore?: boolean;
	showStorage?: boolean;
}

const ProductItem: FC<ProductItemProps> = ({
	product,
	showNutriscore = true,
	showEcoscore = true,
	showStorage = false,
}) => {
	// Vérifier si le produit a déjà un statut d'expiration ou s'il faut le calculer
	const expiryStatus =
		'expiryStatus' in product
			? product.expiryStatus
			: calculateExpiryStatus(product.expiryDate ?? new Date());

	// Obtenir la couleur en fonction du statut d'expiration
	const getExpiryStatusColor = () => {
		switch (expiryStatus) {
			case 'EXPIRED':
				return 'bg-error-100';
			case 'CRITICAL':
				return 'bg-error-50';
			case 'WARNING':
				return 'bg-warning-50';
			case 'GOOD':
				return 'bg-success-50';
			default:
				return 'bg-neutral-200';
		}
	};

	return (
		<Link
			to={product.id ? `/app/inventory/$productId` : '/error'}
			className='flex items-center space-x-3 p-2 hover:bg-neutral-200/10 hover:cursor-pointer rounded-lg cursor-pointer'>
				<div className='flex-shrink-0 size-24 bg-primary-100/30 rounded-md overflow-hidden'>
					{product.imageUrl && (
						<img
							src={product.imageUrl}
							alt={product.name}
							className='size-full object-cover'
						/>
					)}
				</div>
				<div className='flex-1 min-w-0'>
					<p className='text-xl font-medium text-neutral-300 truncate'>
						{product.name}
					</p>
					<p className='text-md text-neutral-200'>{product.brand}</p>
					{showStorage && (
						<p className='text-md text-neutral-200'>
							{product.storageLocation}
						</p>
					)}
					{(showNutriscore || showEcoscore) && (
						<div className='flex'>
							{showNutriscore && (
								<div
									className={`px-2 py-1 rounded-full text-xl font-medium ${getNutriscoreColor(
										product.nutriscore
									)}`}>
									{product.nutriscore}
								</div>
							)}
							{showEcoscore && (
								<div
									className={`px-2 py-1 rounded-full text-xl font-medium ${getNutriscoreColor(
										product.ecoScore
									)}`}>
									{product.ecoScore}
								</div>
							)}
						</div>
					)}
				</div>
				<span
					className={`text-2xl ${getExpiryStatusColor()} px-2 text-center font-bold text-neutral-50 rounded-md`}>
					{formatRelativeDate(product.expiryDate ?? new Date())}
				</span>
		</Link>
	);
};

export default ProductItem;
