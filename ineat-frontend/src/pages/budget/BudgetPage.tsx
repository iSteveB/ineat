import { FC, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';

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

import {
	AlertTriangle,
	Loader2,
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';

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
		setSelectedMonth(currentMonth);
	}, [currentMonth, setSelectedMonth]);

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
								{safeBudgetPeriod || formatMonth(displayedMonth)}
							</h1>
							<p className='text-sm text-gray-600'>
								{isCurrentMonth
									? 'Suivi de vos dépenses'
									: 'Consultation d’un mois passé'}
							</p>
						</div>
					</div>

					{isCurrentMonth &&
						selectedBudget &&
						isValidBudget(selectedBudget) && (
						<div className='flex items-center gap-4'>
							<EditBudgetDialog
								budget={selectedBudget}
								onBudgetUpdated={handleBudgetCreated}
							/>
						</div>
					)}
				</div>
			</div>

			<div className='max-w-7xl mx-auto p-6 space-y-6'>
				<div className='flex flex-wrap items-center justify-center gap-3'>
					<Button
						variant='outline'
						size='sm'
						aria-label='Afficher le mois précédent'
						onClick={() => selectMonth(shiftMonth(displayedMonth, -1))}>
						<ChevronLeft className='size-4' />
					</Button>
					<div className='min-w-40 text-center font-semibold text-gray-900'>
						{formatMonth(displayedMonth)}
					</div>
					<Button
						variant='outline'
						size='sm'
						aria-label='Afficher le mois suivant'
						disabled={displayedMonth >= currentMonth}
						onClick={() => selectMonth(shiftMonth(displayedMonth, 1))}>
						<ChevronRight className='size-4' />
					</Button>
					{!isCurrentMonth && (
						<Button size='sm' onClick={() => selectMonth(currentMonth)}>
							Revenir au mois courant
						</Button>
					)}
				</div>
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
				) : !selectedBudget ||
				  !selectedBudgetStats ||
				  !isValidBudget(selectedBudget) ? (
					isCurrentMonth ? (
						<CreateBudget onBudgetCreated={handleBudgetCreated} />
					) : (
						<Card>
							<CardContent className='py-12 text-center space-y-2'>
								<h2 className='text-lg font-semibold text-gray-900'>
									Aucun budget enregistré en {formatMonth(displayedMonth).toLowerCase()}
								</h2>
								<p className='text-sm text-gray-600'>
									Vous pouvez consulter un autre mois ou revenir au mois courant.
								</p>
							</CardContent>
						</Card>
					)
				) : (
					<div className='space-y-6'>
						{isCurrentMonth && <BudgetAlerts alerts={selectedAlerts} />}
						<BudgetStatsCards
							budget={selectedBudget}
							stats={selectedBudgetStats}
						/>
						<ExpenseList
							expenses={selectedExpenses}
							isLoading={isLoadingExpenses}
						/>
					</div>
				)}
			</div>
		</div>
	);
};
