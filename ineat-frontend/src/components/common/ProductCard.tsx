import React from 'react';
import { InventoryItemResponse } from '@/services/inventoryService';
import {
	ExpiryStatus,
	formatRelativeDate,
	getExpiryStatusColor,
} from '@/utils/dateHelpers';
import { Link } from '@tanstack/react-router';

// Type pour un item avec statut d'expiration
interface InventoryItemWithStatus extends InventoryItemResponse {
	expiryStatus: ExpiryStatus;
}

interface ProductCardProps {
	item: InventoryItemWithStatus;
}

const ProductCard: React.FC<ProductCardProps> = ({ item }) => {
	// Obtenir la couleur selon le statut d'expiration
	const expiryColorClass = getExpiryStatusColor(item.expiryStatus);

	// Formatter l'unité d'affichage
	const formatUnit = (quantity: number, unitType: string): string => {
		if (unitType === 'UNIT') {
			return quantity === 1 ? 'unité' : 'unités';
		}
		return unitType.toLowerCase();
	};

	// Obtenir la classe CSS pour le Nutriscore
	const getNutriscoreClass = (score: string | null): string => {
		if (!score) return 'bg-neutral-200 text-neutral-50';

		const classes: Record<string, string> = {
			A: 'bg-nutriscore-a text-neutral-50',
			B: 'bg-nutriscore-b text-neutral-50',
			C: 'bg-nutriscore-c text-neutral-300',
			D: 'bg-nutriscore-d text-neutral-50',
			E: 'bg-nutriscore-e text-neutral-50',
		};

		return classes[score] || 'bg-neutral-200 text-neutral-50';
	};

	return (
		<Link
			to='/app/inventory/$productId'
			params={{ productId: item.id }}
			className='block'>
			<div className='bg-neutral-50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer'>
				<div className='flex items-start gap-4'>
					{/* Image du produit */}
					<div className='size-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0'>
						{item.product.imageUrl ? (
							<img
								src={item.product.imageUrl}
								alt={item.product.name}
								className='size-full object-cover'
							/>
						) : (
							<div className='size-full flex items-center justify-center text-neutral-200'>
								<span className='text-2xl'>📦</span>
							</div>
						)}
					</div>

					{/* Informations du produit */}
					<div className='flex-1 min-w-0'>
						<div className='flex items-start justify-between gap-2'>
							<div className='flex-1'>
								<h3 className='font-semibold text-neutral-300 truncate'>
									{item.product.name}
								</h3>
								{item.product.brand && (
									<p className='text-sm text-neutral-200 truncate'>
										{item.product.brand}
									</p>
								)}
							</div>

							{/* Nutriscore */}
							{item.product.nutriscore && (
								<div
									className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${getNutriscoreClass(
										item.product.nutriscore
									)}`}>
									{item.product.nutriscore}
								</div>
							)}
						</div>

						{/* Quantité et date d'expiration */}
						<div className='mt-2 flex items-center justify-between'>
							<span className='text-sm text-neutral-200'>
								{item.quantity}{' '}
								{formatUnit(
									item.quantity,
									item.product.unitType
								)}
							</span>

							{item.expiryDate && (
								<span
									className={`text-sm font-medium ${expiryColorClass}`}>
									{formatRelativeDate(item.expiryDate)}
								</span>
							)}
						</div>

						{/* Lieu de stockage */}
						{item.storageLocation && (
							<div className='mt-1'>
								<span className='text-xs text-neutral-200'>
									📍 {item.storageLocation}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</Link>
	);
};

export default ProductCard;
