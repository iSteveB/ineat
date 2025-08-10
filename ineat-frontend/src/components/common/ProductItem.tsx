import type { FC } from 'react';
import { Link } from '@tanstack/react-router';
import type { InventoryItem, ExpiryStatus } from '@/schemas';
import { formatRelativeDate } from '@/utils/dateHelpers';
import { NutriScoreBadge } from '@/components/common/NutriScoreBadge';
import { EcoScoreBadge } from '@/components/common/EcoScoreBadge';
import {
	MapPin,
	Package,
	Calendar,
	ArrowRight,
	AlertTriangle,
	CheckCircle2,
	Clock,
} from 'lucide-react';

interface InventoryItemWithStatus extends InventoryItem {
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
	if (!item) {
		console.error('ProductItem: item is undefined or null');
		return (
			<div className='p-4 text-red-600 text-center bg-red-50 border border-red-200 rounded-xl'>
				<AlertTriangle className='size-5 mx-auto mb-2' />
				Erreur: Données du produit manquantes
			</div>
		);
	}

	// Obtenir les couleurs selon le statut d'expiration
	const getExpiryColors = (status: ExpiryStatus) => {
		switch (status) {
			case 'EXPIRED':
				return {
					bg: 'bg-gradient-to-r from-red-500 to-red-600',
					text: 'text-neutral-50',
					border: 'border-red-200',
					icon: <AlertTriangle className='size-4' />,
				};
			case 'CRITICAL':
				return {
					bg: 'bg-gradient-to-r from-orange-500 to-orange-600',
					text: 'text-neutral-50',
					border: 'border-orange-200',
					icon: <Clock className='size-4' />,
				};
			case 'WARNING':
				return {
					bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
					text: 'text-neutral-50',
					border: 'border-yellow-200',
					icon: <Clock className='size-4' />,
				};
			case 'GOOD':
				return {
					bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
					text: 'text-neutral-50',
					border: 'border-emerald-200',
					icon: <CheckCircle2 className='size-4' />,
				};
			default:
				return {
					bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
					text: 'text-neutral-50',
					border: 'border-gray-200',
					icon: <Calendar className='size-4' />,
				};
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

	const expiryColors = getExpiryColors(item.expiryStatus);

	return (
		<Link
			to='/app/inventory/$productId'
			params={{ productId: item.id }}
			className='block group'>
			<div className='relative overflow-hidden bg-neutral-50 border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:border-gray-300'>
				{/* Effet de brillance en arrière-plan */}
				<div className='absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-2xl -translate-y-8 translate-x-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />

				<div className='flex items-center p-4 gap-4'>
					{/* Image du produit */}
					<div className='relative flex-shrink-0'>
						<div className='size-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300'>
							{item.product.imageUrl ? (
								<img
									src={
										item.product.imageUrl ||
										'/placeholder.svg'
									}
									alt={item.product.name}
									className='size-full object-cover group-hover:scale-110 transition-transform duration-300'
								/>
							) : (
								<div className='size-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
									<Package className='size-8 text-blue-600' />
								</div>
							)}
						</div>
						{/* Badge de quantité */}
						<div className='absolute -bottom-2 -right-2 px-2 py-1 bg-neutral-50 border border-gray-200 rounded-lg shadow-md text-xs font-semibold text-gray-700'>
							{formatQuantity()}
						</div>
					</div>

					{/* Informations du produit */}
					<div className='flex-1 min-w-0 space-y-2'>
						{/* Nom et marque */}
						<div className='space-y-1'>
							<h3 className='text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-300'>
								{item.product.name}
							</h3>
							{item.product.brand && (
								<p className='text-sm font-medium text-gray-600 truncate'>
									{item.product.brand}
								</p>
							)}
						</div>

						{/* Lieu de stockage */}
						{showStorage && item.storageLocation && (
							<div className='flex items-center gap-2'>
								<div className='p-1 bg-blue-50 rounded-lg'>
									<MapPin className='size-3 text-blue-600' />
								</div>
								<span className='text-sm font-medium text-gray-600'>
									{item.storageLocation}
								</span>
							</div>
						)}

						{/* Scores nutritionnels modernisés */}
						{(showNutriscore || showEcoscore) && (
							<div className='flex gap-2'>
								{showNutriscore && item.product.nutriscore && (
									<div className='transform hover:scale-110 transition-transform duration-200'>
										<NutriScoreBadge
											score={item.product.nutriscore}
											size='md'
										/>
									</div>
								)}
								{showEcoscore && item.product.ecoScore && (
									<div className='transform hover:scale-110 transition-transform duration-200'>
										<EcoScoreBadge
											score={item.product.ecoScore}
											size='md'
										/>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Date d'expiration */}
					<div className='flex flex-col items-end gap-2'>
						<div
							className={`
                flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm
                ${expiryColors.bg} ${expiryColors.text} shadow-lg
                hover:shadow-xl transition-all duration-300
              `}>
							{expiryColors.icon}
							<span>
								{formatRelativeDate(
									item.expiryDate || 'Inconnue'
								)}
							</span>
						</div>

						{/* Flèche d'action */}
						<div className='p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors duration-300'>
							<ArrowRight className='size-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300' />
						</div>
					</div>
				</div>

				{/* Barre de progression pour l'expiration */}
				{item.expiryStatus !== 'UNKNOWN' && (
					<div className='absolute bottom-0 left-0 right-0 h-1 bg-gray-100'>
						<div
							className={`h-full ${expiryColors.bg} transition-all duration-300`}
							style={{
								width:
									item.expiryStatus === 'EXPIRED'
										? '100%'
										: item.expiryStatus === 'CRITICAL'
										? '80%'
										: item.expiryStatus === 'WARNING'
										? '60%'
										: '20%',
							}}
						/>
					</div>
				)}
			</div>
		</Link>
	);
};

export default ProductItem;
