import { FC } from 'react';

import BudgetProgress from '@/components/common/BudgetProgress';
import WidgetCard from '@/components/common/WidgetCard';
import { cn } from '@/lib/utils';
import { Budget, BudgetStats } from '@/schemas';
import { budgetService } from '@/services/budgetService';

interface BudgetStatsCardsProps {
	budget: Budget;
	stats: BudgetStats;
}

const formatAmount = (amount: number) => {
	try {
		return budgetService.formatCurrency(amount);
	} catch {
		return `${amount} €`;
	}
};

/** Synthèse du mois : barre de progression puis les chiffres clés en liste de définitions. */
const BudgetStatsCards: FC<BudgetStatsCardsProps> = ({ budget, stats }) => {
	const figures = [
		{ label: 'Budget', value: formatAmount(budget.amount) },
		{ label: 'Dépensé', value: formatAmount(stats.totalSpent) },
		{
			label: stats.remaining < 0 ? 'Dépassement' : 'Restant',
			value: formatAmount(Math.abs(stats.remaining)),
			tone: stats.remaining < 0 ? 'text-danger-700' : 'text-accent-700',
		},
		{ label: 'Moyenne par jour', value: formatAmount(stats.averageDailySpending) },
	];

	return (
		<WidgetCard title='Vue d’ensemble'>
			<BudgetProgress
				spent={stats.totalSpent}
				total={budget.amount}
				daysRemaining={stats.daysRemaining}
			/>
			<dl className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4'>
				{figures.map((figure) => (
					<div key={figure.label} className='rounded-md bg-neutral-50 p-3'>
						<dt className='text-sm text-neutral-600'>{figure.label}</dt>
						<dd className={cn('mt-0.5 font-display text-xl font-bold text-neutral-900', figure.tone)}>
							{figure.value}
						</dd>
					</div>
				))}
			</dl>
		</WidgetCard>
	);
};

export default BudgetStatsCards;
