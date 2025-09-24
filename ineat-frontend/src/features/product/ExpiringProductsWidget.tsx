import type { FC } from 'react';
import ProductItem from '@/features/product/ProductItem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { InventoryItem, ExpiryStatus } from '@/schemas';
import { calculateExpiryStatus } from '@/utils/dateHelpers';
import { AlertTriangle, CheckCircle2, Calendar, ShieldCheck } from 'lucide-react';

// Type étendu avec le statut d'expiration
interface InventoryItemWithStatus extends InventoryItem {
	expiryStatus: ExpiryStatus;
}

interface ExpiringProductsWidgetProps {
	products: InventoryItem[];
}

export const ExpiringProductsWidget: FC<ExpiringProductsWidgetProps> = ({
	products,
}) => {
	// Vérification de sécurité et filtrage des produits valides
	const validProducts = products.filter(
		(product) =>
			product && product.id && product.product && product.product.name
	);

	// Transformer les produits valides pour ajouter le statut d'expiration
	const productsWithStatus: InventoryItemWithStatus[] = validProducts.map(
		(product) => ({
			...product,
			expiryStatus: calculateExpiryStatus(product.expiryDate || '?'),
		})
	);

	// Calculer le niveau d'urgence global
	const getUrgencyLevel = () => {
		if (productsWithStatus.some((p) => p.expiryStatus === 'EXPIRED'))
			return 'critical';
		if (productsWithStatus.some((p) => p.expiryStatus === 'CRITICAL'))
			return 'high';
		if (productsWithStatus.some((p) => p.expiryStatus === 'WARNING'))
			return 'medium';
		return 'low';
	};

	const urgencyLevel = getUrgencyLevel();

	// Obtenir les couleurs selon le niveau d'urgence
	const getUrgencyColors = (level: string) => {
		switch (level) {
			case 'critical':
				return {
					gradient: 'from-red-500 to-red-600',
					bg: 'bg-red-50',
					border: 'border-red-200',
					text: 'text-red-700',
					icon: 'text-red-600',
					cardBg: 'from-white to-red-50/50',
					glowBg: 'from-red-100/30 to-pink-100/30',
				};
			case 'high':
				return {
					gradient: 'from-orange-500 to-orange-600',
					bg: 'bg-orange-50',
					border: 'border-orange-200',
					text: 'text-orange-700',
					icon: 'text-orange-600',
					cardBg: 'from-white to-orange-50/50',
					glowBg: 'from-orange-100/30 to-yellow-100/30',
				};
			case 'medium':
				return {
					gradient: 'from-yellow-500 to-yellow-600',
					bg: 'bg-yellow-50',
					border: 'border-yellow-200',
					text: 'text-yellow-700',
					icon: 'text-yellow-600',
					cardBg: 'from-white to-yellow-50/50',
					glowBg: 'from-yellow-100/30 to-amber-100/30',
				};
			default:
				return {
					gradient: 'from-emerald-500 to-green-600',
					bg: 'bg-emerald-50',
					border: 'border-emerald-200',
					text: 'text-emerald-700',
					icon: 'text-emerald-600',
					cardBg: 'from-white to-emerald-50/50',
					glowBg: 'from-emerald-100/30 to-green-100/30',
				};
		}
	};

	const colors = getUrgencyColors(urgencyLevel);

	const getStatusIcon = () => {
		if (urgencyLevel === 'critical' || urgencyLevel === 'high') {
			return <AlertTriangle className={`size-5 ${colors.icon}`} />;
		}
		if (urgencyLevel === 'medium') {
			return <Calendar className={`size-5 ${colors.icon}`} />;
		}
		return <CheckCircle2 className={`size-5 ${colors.icon}`} />;
	};

	const getStatusMessage = () => {
		if (urgencyLevel === 'critical') return 'Action immédiate requise';
		if (urgencyLevel === 'high') return 'Attention requise';
		if (urgencyLevel === 'medium') return 'Surveillance recommandée';
		return 'Tous vos produits sont frais !';
	};

	return (
		<Card
			className={`relative overflow-hidden border-0 bg-gradient-to-br ${colors.cardBg} shadow-xl hover:shadow-2xl transition-all duration-300`}>
			{/* Effet de brillance en arrière-plan */}
			<div
				className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors.glowBg} rounded-full blur-3xl -translate-y-16 translate-x-16`}
			/>

			<CardHeader className='pb-4'>
				<CardTitle className='flex items-center gap-3 text-gray-800'>
					<div
						className={`p-2 rounded-xl ${colors.bg} ${colors.border} border`}>
						{getStatusIcon()}
					</div>
					<div className='flex-1'>
						<span className='font-semibold'>Expirent bientôt</span>
						<p className='text-sm font-normal text-gray-600 mt-0.5'>
							{getStatusMessage()}
						</p>
					</div>
				</CardTitle>
			</CardHeader>

			<CardContent>
				{productsWithStatus.length > 0 ? (
					<div className='space-y-3'>
						{productsWithStatus.map((item, index) => (
							<div
								key={item.id}
								className='transform transition-all duration-300 hover:scale-[1.01]'
								style={{
									animationDelay: `${index * 100}ms`,
								}}>
								<ProductItem
									item={item}
									showNutriscore={false}
									showEcoscore={false}
									showStorage={false}
								/>
							</div>
						))}
					</div>
				) : (
					<div className='text-center py-12'>
						<div className='relative mb-4'>
							<div className='size-16 mx-auto bg-gradient-to-br from-emerald-100 to-green-200 rounded-2xl flex items-center justify-center'>
								<ShieldCheck className='size-8 text-emerald-600' />
							</div>
						</div>
						<div className='space-y-2'>
							<p className='text-gray-700 font-medium'>
								Tous vos produits sont frais !
							</p>
							<p className='text-sm text-gray-500'>
								Aucun produit n'expire dans les prochains jours
							</p>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};
