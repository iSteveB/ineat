import { FC, useEffect, useMemo, useCallback } from 'react';
import { Link } from '@tanstack/react-router';

import CreateBudget from '@/features/budget/BudgetEditor';
import EditBudgetDialog from '@/features/budget/EditBudgetDialog';
import BudgetStatsCards from '@/features/budget/BudgetStatsCard';
import BudgetAlerts from '@/features/budget/BudgetAlert';
import ExpenseList from '@/features/budget/ExpenseList';

import { isValidBudget } from '@/schemas/budget';

import { useBudgetStore } from '@/stores/budgetStore';
import { budgetService } from '@/services/budgetService';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';

export const BudgetPage: FC = () => {
	const {
		currentBudget,
		budgetStats,
		alerts,
		expenses,
		isLoading,
		isLoadingExpenses,
		error,
		fetchCurrentBudget,
	} = useBudgetStore();

	const safeBudgetPeriod = useMemo(() => {
		if (!currentBudget) {
			return null;
		}

		if (!isValidBudget(currentBudget)) {
			return 'Budget invalide';
		}

		try {
			return budgetService.formatBudgetPeriod(currentBudget);
		} catch {
			return 'Erreur de formatage';
		}
	}, [currentBudget]);

	const handleBudgetCreated = useCallback(() => {
		fetchCurrentBudget();
	}, [fetchCurrentBudget]);

	useEffect(() => {
		fetchCurrentBudget();
	}, [fetchCurrentBudget]);

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30'>
			{/* ===== HEADER ===== */}
			<div className='relative overflow-hidden bg-neutral-50 border-b border-gray-200 shadow-sm'>
				<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

				<div className='relative px-6 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						<Link to='/app'>
							<Button
								variant='ghost'
								size='sm'
								className='size-10 p-0 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 shadow-sm'>
								<ArrowLeft className='size-5' />
							</Button>
						</Link>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>
								Budget{' '}
								{safeBudgetPeriod || 'Période non disponible'}
							</h1>
							<p className='text-sm text-gray-600'>
								Suivi de vos dépenses
							</p>
						</div>
					</div>

					{currentBudget && isValidBudget(currentBudget) && (
						<div className='flex items-center gap-4'>
							<EditBudgetDialog
								budget={currentBudget}
								onBudgetUpdated={handleBudgetCreated}
							/>
						</div>
					)}
				</div>
			</div>

			<div className='max-w-7xl mx-auto p-6 space-y-6'>
				{error && (
					<Alert variant='warning'>
						<AlertTriangle className='size-4' />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{isLoading ? (
					<Card>
						<CardContent className='flex items-center justify-center py-12'>
							<div className='text-center space-y-2'>
								<Loader2 className='size-8 animate-spin mx-auto text-accent' />
								<p className='text-neutral-200'>
									Chargement du budget...
								</p>
							</div>
						</CardContent>
					</Card>
				) : !currentBudget ||
				  !budgetStats ||
				  !isValidBudget(currentBudget) ? (
					<CreateBudget onBudgetCreated={handleBudgetCreated} />
				) : (
					<div className='space-y-6'>
						<BudgetAlerts alerts={alerts} />
						<BudgetStatsCards
							budget={currentBudget}
							stats={budgetStats}
						/>
						<ExpenseList
							expenses={expenses}
							isLoading={isLoadingExpenses}
						/>
					</div>
				)}
			</div>
		</div>
	);
};
