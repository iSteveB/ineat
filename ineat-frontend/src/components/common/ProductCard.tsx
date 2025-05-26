import React from 'react';
import { differenceInDays } from 'date-fns';
import { useNavigate } from '@tanstack/react-router';
import {
	NutriScore,
	StorageLocation,
	ProductWithExpiryStatus,
} from '@/types/product';
import { Package } from 'lucide-react';

// Définition du type pour les propriétés du composant
interface ProductCardProps {
	item: ProductWithExpiryStatus;
}

// Fonction pour déterminer la couleur en fonction des jours restants
const getExpiryStatusColor = (status: string): string => {
	switch (status) {
		case 'EXPIRED':
			return 'bg-error-100 text-white'; // Expiré
		case 'CRITICAL':
			return 'bg-error-50 text-white'; // Critique
		case 'WARNING':
			return 'bg-warning-50 text-neutral-300'; // Attention
		case 'GOOD':
			return 'bg-success-50 text-white'; // OK
		default:
			return 'bg-neutral-100 text-neutral-200'; // Information non disponible
	}
};

// Fonction pour obtenir la couleur du Nutriscore
const getNutriscoreColor = (score?: NutriScore | null): string => {
	if (score === null || score === undefined) {
		return 'bg-neutral-200 text-neutral-50';
	}

	switch (score) {
		case 'A':
			return 'nutriscore-a';
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

const getStorageLocationText = (location?: StorageLocation): string => {
	if (!location) return 'Non spécifié';

	const locationMap: Record<StorageLocation, string> = {
		FRESH: 'Frigo',
		FREEZER: 'Congélateur',
		PANTRY: 'Placard',
		ALL: 'Tous',
	};

	return locationMap[location];
};

const ProductCard: React.FC<ProductCardProps> = ({ item }) => {
	// Calcul des jours restants avant expiration
	const daysRemaining = item.expiryDate
		? differenceInDays(item.expiryDate, new Date())
		: null;

	// Formatage des jours restants
	const expiryText =
		daysRemaining !== null
			? daysRemaining >= 0
				? `J-${daysRemaining}`
				: `Expiré depuis ${Math.abs(daysRemaining)}j`
			: '';

	const expiryClass = getExpiryStatusColor(item.expiryStatus);

	// Utilisation de useNavigate pour rediriger vers la page de détail
	const navigate = useNavigate();

	const goToProductDetail = () => {
		navigate({
			to: '/app/inventory/$productId',
			params: { productId: item.id },
		});
	};

	const getQuantityText = (): string => {
		if (!item.quantity) return '';

		if (item.unitType === 'L' || item.unitType === 'ML') {
			return item.unitType === 'L'
				? `${item.quantity}L`
				: `${item.quantity}mL`;
		} else if (item.unitType === 'KG' || item.unitType === 'G') {
			return item.unitType === 'KG'
				? `${item.quantity}kg`
				: `${item.quantity}g`;
		} else {
			return `${item.quantity} ${item.unit || 'unité(s)'}`;
		}
	};

	return (
		<div
			className='bg-neutral-50 rounded-lg shadow-sm overflow-hidden cursor-pointer'
			onClick={goToProductDetail}>
			<div className='flex p-3'>
				{/* Image du produit */}
				<div className='size-28 bg-primary-50 rounded-md mr-3 overflow-hidden'>
					{item.imageUrl ? (
						<img
							src={item.imageUrl}
							alt={item.name}
							className='size-full object-cover'
						/>
					) : (
						<div className='size--full flex items-center justify-center bg-primary-50'>
							<Package size={32} className='text-neutral-200' />
						</div>
					)}
				</div>

				{/* Informations du produit */}
				<div className='flex-1'>
					<div className='flex justify-between'>
						<div>
							<h3 className='font-medium text-lg'>{item.name}</h3>
							<p className='text-sm text-neutral-200'>
								{item.brand}
							</p>
							<p className='text-sm mt-1'>
								{getStorageLocationText(item.storageLocation)} -{' '}
								{getQuantityText()}
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
								item.nutriscore
							)} size-8 rounded-full flex items-center justify-center font-bold text-lg`}>
							{item.nutriscore || '?'}
						</div>

						{/* Eco-score */}
						<div
							className={`${getNutriscoreColor(
								item.ecoScore as NutriScore
							)} size-8 rounded-full flex items-center justify-center font-bold text-lg`}>
							{item.ecoScore || '?'}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProductCard;
