import { FC, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

import CreateBudget from '@/features/budget/BudgetEditor';
import EditBudgetDialog from '@/features/budget/EditBudgetDialog';
import BudgetStatsCards from '@/features/budget/BudgetStatsCard';
import BudgetAlerts from '@/features/budget/BudgetAlert';
import ExpenseList from '@/features/budget/ExpenseList';

import { isValidBudget } from '@/schemas/budget';

import { useBudgetStore } from '@/stores/budgetStore';
import { budgetService } from '@/services/budgetService';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { CircleAlert, History, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const getCurrentMonth = () => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const shiftMonth = (month: string, offset: number) => {
	const [year, monthNumber] = month.split('-').map(Number);
	const date = new Date(year, monthNumber - 1 + offset, 1);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonth = (month: string) => {
	const [year, monthNumber] = month.split('-').map(Number);
	const label = new Intl.DateTimeFormat('fr-FR', {
		month: 'long',
		year: 'numeric',
	}).format(new Date(year, monthNumber - 1, 1));
	return label.charAt(0).toUpperCase() + label.slice(1);
};

export const BudgetPage: FC = () => {
	const navigate = useNavigate();
	const search = useSearch({ from: '/app/budget/' });
	const currentMonth = getCurrentMonth();
	const displayedMonth = search.month || currentMonth;
	const isCurrentMonth = displayedMonth === currentMonth;
	const {
		selectedBudget,
		selectedBudgetStats,
		selectedAlerts,
		selectedExpenses,
		isLoading,
		isLoadingExpenses,
		error,
		setSelectedMonth,
	} = useBudgetStore();

	const safeBudgetPeriod = useMemo(() => {
		if (!selectedBudget) {
			return null;
		}

		if (!isValidBudget(selectedBudget)) {
			return 'Budget invalide';
		}

		try {
			return budgetService.formatBudgetPeriod(selectedBudget);
		} catch {
			return 'Erreur de formatage';
		}
	}, [selectedBudget]);

	const handleBudgetCreated = useCallback(() => {
		setSelectedMonth(displayedMonth);
	}, [displayedMonth, setSelectedMonth]);

	useEffect(() => {
		setSelectedMonth(displayedMonth);
	}, [displayedMonth, setSelectedMonth]);

	const selectMonth = useCallback(
		(month: string) => {
			if (month > currentMonth) {
				return;
			}
			navigate({
				to: '/app/budget',
				search: month === currentMonth ? {} : { month },
			});
		},
		[currentMonth, navigate]
	);

	return (
		<div className='mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-6 lg:px-12 lg:py-6'>
			<header className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h1 className='type-h1 text-neutral-900'>Budget</h1>
					<p className='text-sm text-neutral-600'>
						{safeBudgetPeriod && isCurrentMonth
							? `Période : ${safeBudgetPeriod}`
							: 'Suivi de vos dépenses alimentaires'}
					</p>
				</div>
				{isCurrentMonth && selectedBudget && isValidBudget(selectedBudget) && (
					<EditBudgetDialog budget={selectedBudget} onBudgetUpdated={handleBudgetCreated} />
				)}
			</header>

			<nav aria-label='Choix du mois' className='flex flex-wrap items-center gap-2'>
				<div className='card flex items-center gap-1 p-1'>
					<Button
						variant='ghost'
						size='icon'
						aria-label='Afficher le mois précédent'
						onClick={() => selectMonth(shiftMonth(displayedMonth, -1))}>
						<ChevronLeft aria-hidden='true' />
					</Button>
					<p aria-live='polite' className='min-w-36 text-center font-display text-lg font-bold text-neutral-900'>
						{formatMonth(displayedMonth)}
					</p>
					<Button
						variant='ghost'
						size='icon'
						aria-label='Afficher le mois suivant'
						disabled={displayedMonth >= currentMonth}
						onClick={() => selectMonth(shiftMonth(displayedMonth, 1))}>
						<ChevronRight aria-hidden='true' />
					</Button>
				</div>
				{!isCurrentMonth && (
					<Button variant='secondary' onClick={() => selectMonth(currentMonth)}>
						Revenir au mois courant
					</Button>
				)}
			</nav>

			{!isCurrentMonth && (
				<p className='flex items-center gap-2 rounded-lg bg-info-50 px-4 py-3 text-sm text-info-700'>
					<History className='size-4 shrink-0' aria-hidden='true' />
					Vous consultez un mois passé.
				</p>
			)}

			{error && (
				<Alert variant='error'>
					<CircleAlert aria-hidden='true' />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{isLoading ? (
				<p role='status' className='flex items-center justify-center gap-3 py-16 text-neutral-600'>
					<Loader2 className='size-6 animate-spin text-accent-600' aria-hidden='true' />
					Chargement du budget…
				</p>
			) : !selectedBudget || !selectedBudgetStats || !isValidBudget(selectedBudget) ? (
				<CreateBudget onBudgetCreated={handleBudgetCreated} month={displayedMonth} />
			) : (
				<div className='flex flex-col gap-4 lg:gap-6'>
					{isCurrentMonth && <BudgetAlerts alerts={selectedAlerts} />}
					<BudgetStatsCards budget={selectedBudget} stats={selectedBudgetStats} />
					<ExpenseList expenses={selectedExpenses} isLoading={isLoadingExpenses} />
				</div>
			)}
		</div>
	);
};
