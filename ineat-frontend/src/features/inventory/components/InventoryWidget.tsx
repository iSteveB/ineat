import {
	MessageCircleWarning,
	OctagonX,
	TriangleAlert,
	Package,
	CheckCircle2,
	ArrowRight,
} from 'lucide-react';
import type { FC } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Link } from '@tanstack/react-router';

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
	// Calculer le statut global de l'inventaire
	const getInventoryStatus = () => {
		if (expiredCount > 0) return 'critical';
		if (criticalCount > 0) return 'warning';
		if (soonExpiringCount > 0) return 'attention';
		if (totalProducts > 0) return 'good';
		return 'empty';
	};

	const status = getInventoryStatus();

	// Obtenir les couleurs selon le statut
	const getStatusColors = (status: string) => {
		switch (status) {
			case 'critical':
				return {
					gradient: 'from-red-500 to-red-600',
					bg: 'bg-red-50',
					border: 'border-red-200',
					text: 'text-red-700',
					icon: 'text-red-600',
				};
			case 'warning':
				return {
					gradient: 'from-orange-500 to-orange-600',
					bg: 'bg-orange-50',
					border: 'border-orange-200',
					text: 'text-orange-700',
					icon: 'text-orange-600',
				};
			case 'attention':
				return {
					gradient: 'from-blue-500 to-blue-600',
					bg: 'bg-blue-50',
					border: 'border-blue-200',
					text: 'text-blue-700',
					icon: 'text-blue-600',
				};
			case 'good':
				return {
					gradient: 'from-emerald-500 to-green-600',
					bg: 'bg-emerald-50',
					border: 'border-emerald-200',
					text: 'text-emerald-700',
					icon: 'text-emerald-600',
				};
			default:
				return {
					gradient: 'from-gray-500 to-gray-600',
					bg: 'bg-gray-50',
					border: 'border-gray-200',
					text: 'text-gray-700',
					icon: 'text-gray-600',
				};
		}
	};

	const colors = getStatusColors(status);

	return (
		<Link to='/app/inventory' className='block group'>
			<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]'>
				{/* Effet de brillance en arrière-plan */}
				<div className='absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-2xl -translate-y-8 translate-x-8' />

				<CardHeader className='pb-4'>
					<CardTitle className='flex items-center justify-between text-gray-800'>
						<div className='flex items-center gap-3'>
							<div
								className={`p-2 rounded-xl ${colors.bg} ${colors.border} border`}>
								<Package className={`size-5 ${colors.icon}`} />
							</div>
							<span className='font-semibold'>Inventaire</span>
						</div>
						<ArrowRight className='size-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300' />
					</CardTitle>
				</CardHeader>

				<CardContent className='space-y-6'>
					{/* ===== STATISTIQUE PRINCIPALE ===== */}
					<div className='flex items-end gap-3'>
						<p className='flex items-baseline gap-2'>
							<span className='text-4xl font-bold text-gray-900'>
								{totalProducts}
							</span>
							<span className='text-lg font-medium text-gray-600'>
								produit{totalProducts > 1 ? 's' : ''}
							</span>
						</p>
						<div className='flex-1 text-right'>
							<span className='text-sm font-medium text-gray-500'>
								en stock
							</span>
						</div>
					</div>

					{/* ===== INDICATEURS D'ÉTAT ===== */}
					<div className='space-y-3'>
						{/* Produits expirés */}
						{expiredCount > 0 && (
							<div className='flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl'>
								<div className='flex-shrink-0 p-1.5 bg-red-100 rounded-lg'>
									<OctagonX className='size-4 text-red-600' />
								</div>
								<div className='flex-1'>
									<span className='text-sm font-semibold text-red-800'>
										{expiredCount} produit
										{expiredCount > 1 ? 's' : ''} expiré
										{expiredCount > 1 ? 's' : ''}
									</span>
									<p className='text-xs text-red-600 mt-0.5'>
										Action immédiate requise
									</p>
								</div>
								<div className='size-2 bg-red-500 rounded-full animate-pulse' />
							</div>
						)}

						{/* Produits critiques */}
						{criticalCount > 0 && (
							<div className='flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl'>
								<div className='flex-shrink-0 p-1.5 bg-orange-100 rounded-lg'>
									<TriangleAlert className='size-4 text-orange-600' />
								</div>
								<div className='flex-1'>
									<span className='text-sm font-semibold text-orange-800'>
										{criticalCount} expire
										{criticalCount > 1 ? 'nt' : ''} sous 2
										jours
									</span>
									<p className='text-xs text-orange-600 mt-0.5'>
										À consommer rapidement
									</p>
								</div>
								<div className='size-2 bg-orange-500 rounded-full animate-pulse' />
							</div>
						)}

						{/* Produits qui expirent bientôt */}
						{soonExpiringCount > 0 &&
							expiredCount === 0 &&
							criticalCount === 0 && (
								<div className='flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl'>
									<div className='flex-shrink-0 p-1.5 bg-blue-100 rounded-lg'>
										<MessageCircleWarning className='size-4 text-blue-600' />
									</div>
									<div className='flex-1'>
										<span className='text-sm font-semibold text-blue-800'>
											{soonExpiringCount} expire
											{soonExpiringCount > 1 ? 'nt' : ''}{' '}
											bientôt
										</span>
										<p className='text-xs text-blue-600 mt-0.5'>
											Planifiez vos repas
										</p>
									</div>
									<div className='size-2 bg-blue-500 rounded-full animate-pulse' />
								</div>
							)}

						{/* État optimal */}
						{expiredCount === 0 &&
							criticalCount === 0 &&
							soonExpiringCount === 0 &&
							totalProducts > 0 && (
								<div className='flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl'>
									<div className='flex-shrink-0 p-1.5 bg-emerald-100 rounded-lg'>
										<CheckCircle2 className='size-4 text-emerald-600' />
									</div>
									<div className='flex-1'>
										<span className='text-sm font-semibold text-emerald-800'>
											Inventaire optimal
										</span>
										<p className='text-xs text-emerald-600 mt-0.5'>
											Tous vos produits sont encore bons
										</p>
									</div>
									<div className='size-2 bg-emerald-500 rounded-full' />
								</div>
							)}

						{/* Inventaire vide */}
						{totalProducts === 0 && (
							<div className='flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl'>
								<div className='flex-shrink-0 p-1.5 bg-gray-100 rounded-lg'>
									<Package className='size-4 text-gray-500' />
								</div>
								<div className='flex-1'>
									<span className='text-sm font-semibold text-gray-700'>
										Inventaire vide
									</span>
									<p className='text-xs text-gray-500 mt-0.5'>
										Commencez par ajouter des produits
									</p>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</Link>
	);
};
