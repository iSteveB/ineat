import type React from 'react';
import { Link } from '@tanstack/react-router';
import type { InventoryItemWithStatus } from '@/schemas';
import { formatRelativeDate, formatQuantity } from '@/utils/ui-utils';
import {
	MapPin,
	Package,
	ArrowRight,
	AlertTriangle,
	CheckCircle2,
	Clock,
	StickyNote,
} from 'lucide-react';
import ScoreBadge from '../../components/common/ScoreBadge';

interface ProductCardProps {
	item: InventoryItemWithStatus;
}

const ProductCard: React.FC<ProductCardProps> = ({ item }) => {
	// Obtenir les couleurs selon le statut d'expiration
	const getExpiryColors = (status: string) => {
		switch (status) {
			case 'EXPIRED':
				return {
					bg: 'bg-gradient-to-r from-red-500 to-red-600',
					text: 'text-neutral-50',
					icon: <AlertTriangle className='size-4' />,
					bar: 'bg-red-500',
				};
			case 'CRITICAL':
				return {
					bg: 'bg-gradient-to-r from-orange-500 to-orange-600',
					text: 'text-neutral-50',
					icon: <Clock className='size-4' />,
					bar: 'bg-orange-500',
				};
			case 'WARNING':
				return {
					bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
					text: 'text-neutral-50',
					icon: <Clock className='size-4' />,
					bar: 'bg-yellow-500',
				};
			case 'GOOD':
				return {
					bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
					text: 'text-neutral-50',
					icon: <CheckCircle2 className='size-4' />,
					bar: 'bg-emerald-500',
				};
			default:
				return {
					bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
					text: 'text-neutral-50',
					icon: <Clock className='size-4' />,
					bar: 'bg-gray-500',
				};
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
				<div className='absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-2xl -translate-y-8 translate-x-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />

				<div className='p-4'>
					<div className='flex items-start gap-4'>
						{/* ===== IMAGE DU PRODUIT ===== */}
						<div className='relative flex-shrink-0'>
							<div className='size-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300'>
								{item.product.imageUrl ? (
									<img
										src={item.product.imageUrl}
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
								{formatQuantity(
									item.quantity,
									item.product.unitType
								)}
							</div>
						</div>

						{/* ===== INFORMATIONS DU PRODUIT ===== */}
						<div className='flex-1 min-w-0 space-y-2'>
							<div className='flex items-start justify-between gap-2'>
								<div className='flex-1 min-w-0'>
									<h3 className='font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-300'>
										{item.product.name}
									</h3>
									{item.product.brand && (
										<p className='text-sm font-medium text-gray-600 truncate'>
											{item.product.brand}
										</p>
									)}
								</div>

								{/* ===== SCORES NUTRITIONNELS ===== */}
								<div className='flex gap-2'>
									{item.product.nutriscore && (
										<ScoreBadge
											type='nutri'
											score={item.product.nutriscore}
											size='md'
										/>
									)}
									{item.product.ecoScore && (
										<ScoreBadge
											type='eco'
											score={item.product.ecoScore}
											size='md'
										/>
									)}
									{item.product.novaScore && (
										<ScoreBadge
											type='nova'
											score={item.product.novaScore}
											size='md'
										/>
									)}
								</div>
							</div>

							{/* ===== DATE D'EXPIRATION ===== */}
							{item.expiryDate && (
								<div
									className={`
                    inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-sm
                    ${expiryColors.bg} ${expiryColors.text} shadow-lg
                    hover:shadow-xl transition-all duration-300
                  `}>
									{expiryColors.icon}
									<span>
										{formatRelativeDate(item.expiryDate)}
									</span>
								</div>
							)}

							{/* ===== LIEU DE STOCKAGE ===== */}
							{item.storageLocation && (
								<div className='flex items-center gap-2'>
									<div className='p-1 bg-blue-50 rounded-lg'>
										<MapPin className='size-3 text-blue-600' />
									</div>
									<span className='text-sm font-medium text-gray-600'>
										{item.storageLocation
											.charAt(0)
											.toUpperCase() +
											item.storageLocation.slice(1)}
									</span>
								</div>
							)}

							{/* ===== NOTES ===== */}
							{item.notes && (
								<div className='flex items-start gap-2 p-2 bg-gray-50 rounded-lg'>
									<div className='p-1 bg-gray-100 rounded'>
										<StickyNote className='size-3 text-gray-600' />
									</div>
									<span className='text-xs text-gray-600 italic leading-relaxed'>
										{item.notes}
									</span>
								</div>
							)}
						</div>

						{/* Flèche d'action */}
						<div className='flex-shrink-0 self-center'>
							<div className='p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors duration-300'>
								<ArrowRight className='size-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300' />
							</div>
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
};

export default ProductCard;
