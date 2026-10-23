import { FC } from 'react';

import BudgetProgress from '@/components/common/BudgetProgress';
import WidgetCard from '@/components/common/WidgetCard';
import { formatCurrency, BudgetStats } from '@/schemas/budget';
import { getCurrentMonthTitle } from '@/utils/ui-utils';

interface BudgetSummaryProps {
	budgetStats: BudgetStats;
}

const BudgetSummary: FC<BudgetSummaryProps> = ({ budgetStats }) => {
	const { totalBudget, totalSpent, isOverBudget, daysRemaining, suggestedDailyBudget } =
		budgetStats;

	return (
		<WidgetCard
			title='Budget'
			subtitle={getCurrentMonthTitle()}
			action={{ label: 'Détails', to: '/app/budget' }}>
			<BudgetProgress spent={totalSpent} total={totalBudget} daysRemaining={daysRemaining} />
			{daysRemaining > 0 && !isOverBudget && (
				<p className='mt-3 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700'>
					Conseillé : {formatCurrency(suggestedDailyBudget)} par jour jusqu'à la fin du mois.
				</p>
			)}
		</WidgetCard>
	);
};

export default BudgetSummary;
