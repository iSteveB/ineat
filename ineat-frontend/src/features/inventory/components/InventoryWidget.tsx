import { MessageCircleWarning, OctagonX, TriangleAlert } from 'lucide-react';
import { FC } from 'react';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardStatValue,
	CardStatLabel,
} from '@/components/ui/card';
import { Link } from '@tanstack/react-router';

// Widget d'inventaire qui affiche le nombre total de produits et ceux qui expirent bientôt
interface InventoryWidgetProps {
	totalProducts: number;
	soonExpiringCount: number;
	criticalCount: number;
	expiredCount: number;
}

export const InventoryWidget: FC<InventoryWidgetProps> = ({
	totalProducts,
	soonExpiringCount,
	criticalCount,
	expiredCount,
}) => {
	return (
		<Link to='/app/inventory' className='block'>
			<Card className='hover:shadow-md transition-shadow cursor-pointer'>
				<CardHeader>
					<CardTitle>Produit{totalProducts > 1 ? 's' : ''}</CardTitle>
				</CardHeader>

				<CardContent>
					<div className='flex gap-2 items-end mb-4'>
						<CardStatValue>{totalProducts}</CardStatValue>
						<CardStatLabel>en stock</CardStatLabel>
					</div>

					<div className='space-y-2'>
						{/* Produits expirés */}
						{expiredCount > 0 && (
							<div className='flex gap-2 items-center'>
								<OctagonX className='size-4 text-red-600' />
								<span className='text-sm text-gray-600 font-medium'>
									{expiredCount} expiré
									{expiredCount > 1 ? 's' : ''}
								</span>
							</div>
						)}

						{/* Produits critiques (expire sous 2 jours) */}
						{criticalCount > 0 && (
							<div className='flex gap-2 items-center'>
								<TriangleAlert className='size-4 text-orange-500' />
								<span className='text-sm text-gray-600 font-medium'>
									{criticalCount} expire
									{criticalCount > 1 ? 'nt' : ''} sous 2 jours
								</span>
							</div>
						)}

						{/* Produits qui expirent bientôt (sous 5 jours) */}
						{soonExpiringCount > 0 && (
							<div className='flex gap-2 items-center'>
								<MessageCircleWarning className='size-4 text-blue-500' />
								<span className='text-sm text-gray-600 font-medium'>
									{soonExpiringCount} expire
									{soonExpiringCount > 1 ? 'nt' : ''} bientôt
								</span>
							</div>
						)}

						{/* Message si aucun problème d'expiration */}
						{expiredCount === 0 &&
							criticalCount === 0 &&
							soonExpiringCount === 0 &&
							totalProducts > 0 && (
								<div className='flex gap-2 items-center'>
									<div className='size-4 rounded-full bg-green-500' />
									<span className='text-sm text-gray-600 font-medium'>
										Tous vos produits sont encore bons
									</span>
								</div>
							)}

						{/* Message si aucun produit */}
						{totalProducts === 0 && (
							<div className='text-sm text-gray-500 italic'>
								Aucun produit en stock
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</Link>
	);
};
