import { type FC, useEffect, useState } from 'react';
import { CircleAlert, Loader2 } from 'lucide-react';

import WidgetCard from '@/components/common/WidgetCard';
import BudgetOnboardingCard from '@/features/budget/BudgetOnboardingCard';
import BudgetSummary from '@/features/budget/BudgetSummary';
import { Button } from '@/components/ui/button';
import { useBudgetStore, useHasBudget } from '@/stores/budgetStore';

export const BudgetWidget: FC = () => {
	const hasBudget = useHasBudget();
	const { budgetStats, isLoading, error, fetchCurrentBudget, clearError } =
		useBudgetStore();

	const [hasInitialized, setHasInitialized] = useState(false);

	useEffect(() => {
		if (!hasInitialized) {
			fetchCurrentBudget();
			setHasInitialized(true);
		}
	}, [fetchCurrentBudget, hasInitialized]);

	if (isLoading) {
		return (
			<WidgetCard title='Budget'>
				<p role='status' className='flex items-center gap-2 py-4 text-sm text-neutral-600'>
					<Loader2 className='size-5 animate-spin text-accent-600' aria-hidden='true' />
					Chargement du budget…
				</p>
			</WidgetCard>
		);
	}

	if (error) {
		return (
			<WidgetCard title='Budget'>
				<div
					role='alert'
					className='flex flex-wrap items-center justify-between gap-3 rounded-md bg-danger-50 p-3'>
					<p className='flex items-center gap-2 text-sm font-medium text-danger-700'>
						<CircleAlert className='size-4 shrink-0' aria-hidden='true' />
						{error}
					</p>
					<Button
						variant='secondary'
						size='sm'
						onClick={() => {
							clearError();
							fetchCurrentBudget(true);
						}}>
						Réessayer
					</Button>
				</div>
			</WidgetCard>
		);
	}

	if (!hasBudget || !budgetStats) {
		return <BudgetOnboardingCard />;
	}

	return <BudgetSummary budgetStats={budgetStats} />;
};
