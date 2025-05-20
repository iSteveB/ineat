import React from 'react';
import { parseISO, differenceInDays } from 'date-fns';
import { NutriScore } from '@/types/product';
import { InventoryItem } from '@/types/inventory';
import { ExpiryStatus, ExpiryStatusType } from '@/types/common';

// Définition du type pour les propriétés du composant
interface ProductCardProps {
	item: InventoryItem;
}

// Fonction pour déterminer le statut d'expiration
const getExpiryStatus = (daysRemaining: number): ExpiryStatusType => {
	if (daysRemaining < 0) return ExpiryStatus.EXPIRED;
	if (daysRemaining <= 2) return ExpiryStatus.CRITICAL;
	if (daysRemaining <= 5) return ExpiryStatus.WARNING;
	return ExpiryStatus.GOOD;
};

// Fonction pour déterminer la couleur en fonction du statut d'expiration
const getExpiryStatusColor = (daysRemaining: number): string => {
	const status = getExpiryStatus(daysRemaining);

	switch (status) {
		case ExpiryStatus.EXPIRED:
			return 'bg-error-100 text-neutral-50';
		case ExpiryStatus.CRITICAL:
			return 'bg-error-50 text-neutral-50';
		case ExpiryStatus.WARNING:
			return 'bg-warning-50 text-neutral-300';
		case ExpiryStatus.GOOD:
			return 'bg-success-50 text-neutral-50';
		default:
			return 'bg-neutral-200 text-neutral-50';
	}
};

// Fonction pour obtenir la couleur du Nutriscore
const getNutriscoreColor = (score?: NutriScore): string => {
	if (!score) return 'bg-neutral-200 text-neutral-50';

	switch (score) {
		case 'A':
			return 'nutriscore-a ';
		case 'B':
			return 'nutriscore-b';
		case 'C':
			return 'nutriscore-c';
		case 'D':
			return 'nutriscore-d';
		case 'E':
			return 'nutriscore-e';
		default:
			return 'bg-neutral-200 text-neutral-50';
	}
};

const ProductCard: React.FC<ProductCardProps> = ({ item }) => {
	// Calcul des jours restants avant expiration
	const daysRemaining = item.expiryDate
		? differenceInDays(
				typeof item.expiryDate === 'string'
					? parseISO(item.expiryDate)
					: item.expiryDate,
				new Date()
		  )
		: null;

	// Formatage des jours restants
	const expiryText =
		daysRemaining !== null
			? daysRemaining >= 0
				? `J-${daysRemaining}`
				: `Expiré depuis ${Math.abs(daysRemaining)}j`
			: '';

	const expiryClass =
		daysRemaining !== null ? getExpiryStatusColor(daysRemaining) : '';

	return (
		<div className='bg-neutral-50 rounded-lg shadow-sm overflow-hidden'>
			<div className='flex p-3'>
				{/* Image du produit */}
				<div className='size-28 bg-primary-50 rounded-md mr-3 overflow-hidden'>
					{item.product.imageUrl ? (
						<img
							src={item.product.imageUrl}
							alt={item.product.name}
							className='size-full object-cover'
						/>
					) : (
						<div className='size-full flex items-center justify-center bg-primary-50'>
							{/* Placeholder pour l'image */}
							<span className='text-xs text-neutral-200 text-center'>
								Image non disponible
							</span>
						</div>
					)}
				</div>

				{/* Informations du produit */}
				<div className='flex-1'>
					<div className='flex justify-between'>
						<div>
							<h3 className='font-medium text-lg'>
								{item.product.name}
							</h3>
							<p className='text-sm text-neutral-200'>
								{item.product.brand}
							</p>
							<p className='text-sm mt-1'>
								{item.storageLocation} - {item.quantity}{' '}
								{item.unity}
							</p>
						</div>

						{/* Badge de péremption */}
						{daysRemaining !== null && (
							<div
								className={`${expiryClass} px-3 py-1 rounded-lg h-min text-sm font-medium`}>
								{expiryText}
							</div>
						)}
					</div>

					{/* Badges Nutriscore et autres indicateurs */}
					<div className='flex mt-2 space-x-2'>
						{/* Nutriscore */}
						<div
							className={`${getNutriscoreColor(
								item.product.nutriscore
							)} size-8 rounded-full flex items-center justify-center font-bold text-lg`}>
							{item.product.nutriscore || '?'}
						</div>

						{/* Quantité */}
						<div className='bg-accent size-8 rounded-full flex items-center justify-center text-neutral-50 font-bold'>
							{item.quantity}
						</div>

						{/* Eco-score */}
						<div
							className={`${getNutriscoreColor(
								item.product.ecoScore as NutriScore
							)} size-8 rounded-full flex items-center justify-center font-bold text-lg`}>
							{item.product.ecoScore || '?'}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProductCard;
