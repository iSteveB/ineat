import { FC } from 'react';
import { InventoryItemResponse } from '@/services/inventoryService';
import {
	formatRelativeDate,
	ExpiryStatus,
} from '@/utils/dateHelpers';
import { getNutriscoreColor } from '@/utils/utils';
import { Link } from '@tanstack/react-router';

interface InventoryItemWithStatus extends InventoryItemResponse {
	expiryStatus: ExpiryStatus;
}

interface ProductItemProps {
	item: InventoryItemWithStatus;
	showNutriscore?: boolean;
	showEcoscore?: boolean;
	showStorage?: boolean;
}

const ProductItem: FC<ProductItemProps> = ({
	item,
	showNutriscore = true,
	showEcoscore = true,
	showStorage = true,
}) => {
	// Obtenir la couleur de fond en fonction du statut d'expiration
	const getExpiryStatusBgColor = () => {
		switch (item.expiryStatus) {
			case 'expired':
				return 'bg-error-100';
			case 'urgent':
				return 'bg-error-50';
			case 'warning':
				return 'bg-warning-50';
			case 'safe':
				return 'bg-success-50';
			case 'no-date':
				return 'bg-neutral-100';
			default:
				return 'bg-neutral-100';
		}
	};

	// Obtenir la couleur du texte en fonction du statut d'expiration
	const getExpiryStatusTextColor = () => {
		switch (item.expiryStatus) {
			case 'expired':
			case 'urgent':
			case 'warning':
			case 'safe':
				return 'text-neutral-50';
			case 'no-date':
			default:
				return 'text-neutral-200';
		}
	};

	// Formater la quantité avec l'unité
	const formatQuantity = () => {
		const { quantity, product } = item;
		const unit = product.unitType.toLowerCase();

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
				return `${quantity} ${unit}`;
		}
	};

	return (
		<Link
			to='/app/inventory/$productId'
			params={{ productId: item.id }}
			className='block'>
			<div className='flex items-center space-x-3 p-3 hover:bg-neutral-100 rounded-xl transition-colors'>
				{/* Image du produit */}
				<div className='flex-shrink-0 size-20 bg-primary-100 rounded-lg overflow-hidden'>
					{item.product.imageUrl ? (
						<img
							src={item.product.imageUrl}
							alt={item.product.name}
							className='size-full object-cover'
						/>
					) : (
						<div className='size-full flex items-center justify-center'>
							<span className='text-2xl'>📦</span>
						</div>
					)}
				</div>

				{/* Informations du produit */}
				<div className='flex-1 min-w-0'>
					<p className='text-lg font-medium text-neutral-300 truncate'>
						{item.product.name}
					</p>
					{item.product.brand && (
						<p className='text-sm text-neutral-200'>
							{item.product.brand}
						</p>
					)}

					{/* Quantité et lieu de stockage */}
					<div className='flex items-center gap-3 mt-1'>
						<span className='text-sm text-neutral-200'>
							{formatQuantity()}
						</span>
						{showStorage && item.storageLocation && (
							<span className='text-sm text-neutral-200'>
								📍 {item.storageLocation}
							</span>
						)}
					</div>

					{/* Scores nutritionnels */}
					{(showNutriscore || showEcoscore) && (
						<div className='flex gap-2 mt-2'>
							{showNutriscore && item.product.nutriscore && (
								<div
									className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${getNutriscoreColor(
										item.product.nutriscore
									)}`}>
									{item.product.nutriscore}
								</div>
							)}
							{showEcoscore && item.product.ecoScore && (
								<div
									className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${getNutriscoreColor(
										item.product.ecoScore
									)}`}>
									Eco {item.product.ecoScore}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Date d'expiration */}
				<div
					className={`px-3 py-2 rounded-lg font-medium ${getExpiryStatusBgColor()} ${getExpiryStatusTextColor()}`}>
					{formatRelativeDate(item.expiryDate)}
				</div>
			</div>
		</Link>
	);
};

export default ProductItem;
