import { FC } from 'react';
import { Link } from '@tanstack/react-router';
import { InventoryItemResponse } from '@/services/inventoryService';
import {
	formatRelativeDate,
	ExpiryStatus,
	getExpiryStatusBgColor
} from '@/utils/dateHelpers';
import { NutriScoreBadge } from '@/components/common/NutriScoreBadge';
import { EcoScoreBadge } from '@/components/common/EcoScoreBadge';

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
	// Vérification de sécurité complète pour éviter les erreurs
	if (!item) {
		console.error('ProductItem: item is undefined or null');
		return (
			<div className='p-3 text-error-50 text-center'>
				Erreur: Données du produit manquantes
			</div>
		);
	}

	if (!item.id) {
		console.error('ProductItem: item.id is undefined', item);
		return (
			<div className='p-3 text-error-50 text-center'>
				Erreur: ID du produit manquant
			</div>
		);
	}

	if (!item.product) {
		console.error('ProductItem: item.product is undefined', item);
		return (
			<div className='p-3 text-error-50 text-center'>
				Erreur: Informations produit manquantes
			</div>
		);
	}

	if (!item.product.name) {
		console.error('ProductItem: item.product.name is undefined', item);
		return (
			<div className='p-3 text-error-50 text-center'>
				Erreur: Nom du produit manquant
			</div>
		);
	}

	// Obtenir la couleur du texte adaptée au fond coloré
	const getTextColorForStatus = (status: ExpiryStatus): string => {
		switch (status) {
			case 'expired':
			case 'urgent':
			case 'warning':
			case 'safe':
				return 'text-white'; // Texte blanc sur fond coloré
			case 'no-date':
			default:
				return 'text-neutral-200'; // Texte gris sur fond neutre
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

					{/* Scores nutritionnels avec les nouveaux composants badge */}
					{(showNutriscore || showEcoscore) && (
						<div className='flex gap-2 mt-2'>
							{showNutriscore && item.product.nutriscore && (
								<NutriScoreBadge 
									score={item.product.nutriscore}
									size="md"
								/>
							)}
							{showEcoscore && item.product.ecoScore && (
								<EcoScoreBadge 
									score={item.product.ecoScore}
									size="md"
								/>
							)}
						</div>
					)}
				</div>

				{/* Date d'expiration */}
				<div
					className={`px-3 py-2 rounded-lg font-medium ${getExpiryStatusBgColor(item.expiryStatus)} ${getTextColorForStatus(item.expiryStatus)}`}>
					{formatRelativeDate(item.expiryDate)}
				</div>
			</div>
		</Link>
	);
};

export default ProductItem;