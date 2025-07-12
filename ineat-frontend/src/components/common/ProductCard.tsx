import React from 'react';
import { Link } from '@tanstack/react-router';

// ===== IMPORTS SCHÉMAS ZOD =====
import { InventoryItemWithStatus, NutriScore } from '@/schemas';

// ===== IMPORTS UTILITAIRES UI =====
import {
	formatRelativeDate,
	getExpiryStatusTextColor,
	getNutriscoreBackgroundColor,
	formatQuantity,
} from '@/utils/ui-utils';

// ===== INTERFACE PROPS =====
interface ProductCardProps {
	item: InventoryItemWithStatus;
}

// ===== COMPOSANT PRODUCT CARD =====
const ProductCard: React.FC<ProductCardProps> = ({ item }) => {
	// Obtenir la couleur selon le statut d'expiration
	const expiryColorClass = getExpiryStatusTextColor(item.expiryStatus);

	// Obtenir la classe CSS pour le Nutriscore
	const getNutriscoreClass = (score: NutriScore): string => {
		const bgColor = getNutriscoreBackgroundColor(score);

		// Déterminer la couleur du texte selon le score pour un bon contraste
		const textColor =
			score === 'C' ? 'text-neutral-300' : 'text-neutral-50';

		return `${bgColor} ${textColor}`;
	};

	return (
		<Link
			to='/app/inventory/$productId'
			params={{ productId: item.id }}
			className='block'>
			<div className='bg-neutral-50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer'>
				<div className='flex items-start gap-4'>
					{/* ===== IMAGE DU PRODUIT ===== */}
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

					{/* ===== INFORMATIONS DU PRODUIT ===== */}
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

							{/* ===== NUTRISCORE ===== */}
							{item.product.nutriscore && (
								<div
									className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${getNutriscoreClass(
										item.product.nutriscore
									)}`}>
									{item.product.nutriscore}
								</div>
							)}
						</div>

						{/* ===== QUANTITÉ ET DATE D'EXPIRATION ===== */}
						<div className='mt-2 flex items-center justify-between'>
							<span className='text-sm text-neutral-200'>
								{formatQuantity(
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

						{/* ===== LIEU DE STOCKAGE ===== */}
						{item.storageLocation && (
							<div className='mt-1'>
								<span className='text-xs text-neutral-200'>
									📍 {item.storageLocation}
								</span>
							</div>
						)}

						{/* ===== INFORMATIONS SUPPLÉMENTAIRES ===== */}
						{item.notes && (
							<div className='mt-1'>
								<span className='text-xs text-neutral-200 italic'>
									{item.notes}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* ===== BARRE DE STATUT D'EXPIRATION ===== */}
				{item.expiryDate && (
					<div className='mt-3 h-1 w-full rounded-full bg-neutral-100'>
						<div
							className={`h-full rounded-full transition-all duration-300 ${
								item.expiryStatus === 'EXPIRED'
									? 'bg-error-100'
									: item.expiryStatus === 'CRITICAL'
									? 'bg-error-50'
									: item.expiryStatus === 'WARNING'
									? 'bg-warning-50'
									: 'bg-success-50'
							}`}
							style={{
								width: `${
									item.expiryStatus === 'EXPIRED'
										? 100
										: item.expiryStatus === 'CRITICAL'
										? 85
										: item.expiryStatus === 'WARNING'
										? 60
										: 30
								}%`,
							}}
						/>
					</div>
				)}
			</div>
		</Link>
	);
};

export default ProductCard;
