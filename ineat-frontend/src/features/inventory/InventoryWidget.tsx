import {
	CalendarX,
	CheckCircle2,
	Clock,
	Loader2,
	Package,
	TriangleAlert,
	type LucideIcon,
} from 'lucide-react';
import type { FC } from 'react';
import { useEffect } from 'react';
import WidgetCard from '@/components/common/WidgetCard';
import { cn } from '@/lib/utils';
import {
	useInventoryItems,
	useInventoryLoading,
	useInventoryError,
	useInventoryActions,
} from '@/stores/inventoryStore';
import { calculateExpiryStatus, type ExpiryStatus } from '@/schemas';

interface InventoryWidgetProps {
	// Props optionnelles pour la compatibilité, mais on utilisera les données du store
	totalProducts?: number;
	soonExpiringCount?: number;
	criticalCount?: number;
	expiredCount?: number;
}

export const InventoryWidget: FC<InventoryWidgetProps> = ({
	totalProducts: providedTotalProducts,
	soonExpiringCount: providedSoonExpiringCount,
	criticalCount: providedCriticalCount,
	expiredCount: providedExpiredCount,
}) => {
	const hasProvidedStats =
		providedTotalProducts !== undefined ||
		providedSoonExpiringCount !== undefined ||
		providedCriticalCount !== undefined ||
		providedExpiredCount !== undefined;

	// Utiliser les mêmes hooks que l'InventoryPage pour assurer la cohérence
	const items = useInventoryItems();
	const isLoading = useInventoryLoading();
	const error = useInventoryError();
	const { fetchInventoryItems } = useInventoryActions();

	// Récupérer les données à l'initialisation du composant
	useEffect(() => {
		if (!hasProvidedStats) {
			fetchInventoryItems();
		}
	}, [fetchInventoryItems, hasProvidedStats]);

	const countQuantityByStatus = (status: ExpiryStatus) =>
		items.reduce((total, item) => {
			if (item.lots?.length) {
				return (
					total +
					item.lots
						.filter((lot) => calculateExpiryStatus(lot.expiryDate) === status)
						.reduce((lotTotal, lot) => lotTotal + lot.quantity, 0)
				);
			}

			return item.expiryStatus === status ? total + item.quantity : total;
		}, 0);

	// Calculer les statistiques directement depuis les items
	const totalProducts =
		providedTotalProducts ??
		items.reduce((total, item) => total + item.quantity, 0);
	
	// Calculer les comptes par statut d'expiration
	const expiredCount =
		providedExpiredCount ?? countQuantityByStatus('EXPIRED');
	const criticalCount =
		providedCriticalCount ?? countQuantityByStatus('CRITICAL');
	const warningCount = countQuantityByStatus('WARNING');
	const soonExpiringCount =
		providedSoonExpiringCount ?? criticalCount + warningCount;

	const plural = (count: number, singular: string, pluralForm: string) =>
		count > 1 ? pluralForm : singular;

	// Une ligne par état, du plus urgent au plus rassurant ; la couleur s'accompagne toujours d'une icône et d'un texte.
	const rows: { icon: LucideIcon; tone: string; title: string; detail: string }[] = [];
	if (expiredCount > 0) {
		rows.push({
			icon: CalendarX,
			tone: 'bg-danger-50 text-danger-700',
			title: `${expiredCount} ${plural(expiredCount, 'produit périmé', 'produits périmés')}`,
			detail: 'À vérifier puis retirer de l’inventaire.',
		});
	}
	if (criticalCount > 0) {
		rows.push({
			icon: TriangleAlert,
			tone: 'bg-danger-50 text-danger-700',
			title: `${criticalCount} ${plural(criticalCount, 'expire', 'expirent')} sous 2 jours`,
			detail: 'À consommer rapidement.',
		});
	}
	if (soonExpiringCount > 0 && expiredCount === 0 && criticalCount === 0) {
		rows.push({
			icon: Clock,
			tone: 'bg-warning-50 text-warning-700',
			title: `${soonExpiringCount} ${plural(soonExpiringCount, 'expire', 'expirent')} bientôt`,
			detail: 'Pensez-y pour vos prochains repas.',
		});
	}
	if (rows.length === 0 && totalProducts > 0) {
		rows.push({
			icon: CheckCircle2,
			tone: 'bg-success-50 text-success-700',
			title: 'Tout est en ordre',
			detail: 'Tous vos produits sont encore bons.',
		});
	}
	if (totalProducts === 0) {
		rows.push({
			icon: Package,
			tone: 'bg-neutral-50 text-neutral-700',
			title: 'Inventaire vide',
			detail: 'Commencez par ajouter des produits.',
		});
	}

	if (!hasProvidedStats && isLoading) {
		return (
			<WidgetCard title='État du stock'>
				<p role='status' className='flex items-center gap-2 py-4 text-sm text-neutral-600'>
					<Loader2 className='size-5 animate-spin text-accent-600' aria-hidden='true' />
					Chargement de l’inventaire…
				</p>
			</WidgetCard>
		);
	}

	if (!hasProvidedStats && error) {
		return (
			<WidgetCard title='État du stock'>
				<p role='alert' className='rounded-md bg-danger-50 p-3 text-sm text-danger-700'>
					Erreur lors du chargement : {error}
				</p>
			</WidgetCard>
		);
	}

	return (
		<WidgetCard
			title='État du stock'
			subtitle={`${totalProducts} ${plural(totalProducts, 'produit', 'produits')} en stock`}
			action={{ label: 'Inventaire', to: '/app/inventory' }}>
			<ul className='flex flex-col gap-2'>
				{rows.map((row) => {
					const Icon = row.icon;

					return (
						<li key={row.title} className={cn('flex items-center gap-3 rounded-md p-3', row.tone)}>
							<Icon className='size-5 shrink-0' aria-hidden='true' />
							<div>
								<p className='font-medium'>{row.title}</p>
								<p className='text-sm text-neutral-700'>{row.detail}</p>
							</div>
						</li>
					);
				})}
			</ul>
		</WidgetCard>
	);
};
