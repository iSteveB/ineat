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
		<Link to='/app/inventory'>
		<Card>
			<CardHeader>
				<CardTitle>Produit{totalProducts > 1 ? 's' : ''}</CardTitle>
			</CardHeader>

			<CardContent>
				<div className='flex gap-2 items-end mb-4'>
					<CardStatValue>{totalProducts}</CardStatValue>
					<CardStatLabel>en stock</CardStatLabel>
				</div>

				<div className='space-y-2'>
					{/*Expirée*/}
					{expiredCount > 0 && (
						<div className='flex gap-2 items-center'>
							<span className='text-error-100'>
								<OctagonX />
							</span>
							<span className='text-neutral-200 font-medium'>
								{expiredCount} expiré
								{expiredCount > 1 ? 's' : ''}
							</span>
						</div>
					)}
					{/*Expire sous 2 jours*/}
					{criticalCount > 0 && (
						<div className='flex gap-2 items-center'>
							<span className='text-error-50'>
								<TriangleAlert />
							</span>
							<span className='text-neutral-200 font-medium'>
								{criticalCount} expire
								{criticalCount > 1 ? 'nt' : ''} sous 2 jours
							</span>
						</div>
					)}
					{/*Expire sous 5 jours*/}
					{soonExpiringCount > 0 && (
						<div className='flex gap-2 items-center'>
							<span className='text-info-400'>
								<MessageCircleWarning />
							</span>
							<span className='text-neutral-200 font-medium'>
								{soonExpiringCount} expire
								{soonExpiringCount > 1 ? 'nt' : ''} bientôt
							</span>
						</div>
					)}
				</div>
			</CardContent>
			</Card>
		</Link>
	);
};
