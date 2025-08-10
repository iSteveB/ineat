import { type FC, useEffect, useState } from 'react';

import BudgetOnboardingCard from '@/features/budget/BudgetOnboardingCard';
import BudgetSummary from '@/features/budget/BudgetSummary';

import { useBudgetStore, useHasBudget } from '@/stores/budgetStore';
import {
	Card,
	CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Loader2,
	AlertTriangle,
} from 'lucide-react';

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
			<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-xl'>
				<CardContent className='flex items-center justify-center py-12'>
					<div className='text-center space-y-4'>
						<div className='relative'>
							<Loader2 className='size-12 animate-spin text-blue-600 mx-auto' />
							<div className='absolute inset-0 size-12 border-4 border-blue-200 rounded-full animate-pulse mx-auto' />
						</div>
						<div className='space-y-2'>
							<p className='text-gray-700 font-medium'>
								Vérification du budget...
							</p>
							<p className='text-sm text-gray-500'>
								Analyse de vos données financières
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-red-50/50 shadow-xl'>
				<CardContent className='py-6'>
					<Alert className='border-red-200 bg-red-50'>
						<AlertTriangle className='size-4 text-red-600' />
						<AlertDescription className='flex justify-between items-center'>
							<span className='text-red-800 font-medium'>
								{error}
							</span>
							<Button
								variant='outline'
								size='sm'
								onClick={() => {
									clearError();
									fetchCurrentBudget(true);
								}}
								className='border-red-200 text-red-700 hover:bg-red-100'>
								Réessayer
							</Button>
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	if (!hasBudget || !budgetStats) {
		return <BudgetOnboardingCard />;
	}

	return <BudgetSummary budgetStats={budgetStats} />;
};
