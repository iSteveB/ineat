import { Loader2, Receipt } from 'lucide-react';
import { FC } from 'react';

import WidgetCard from '@/components/common/WidgetCard';
import { Expense } from '@/schemas';
import { budgetService } from '@/services/budgetService';

interface ExpenseListProps {
	expenses: Expense[];
	isLoading: boolean;
}

const formatAmount = (amount: number) => {
	try {
		return budgetService.formatCurrency(amount);
	} catch {
		return `${amount} €`;
	}
};

const formatDay = (date: string) =>
	new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(date));

/** Dépenses du mois en liste : lisible sur mobile, sans tableau à défilement horizontal. */
const ExpenseList: FC<ExpenseListProps> = ({ expenses, isLoading }) => {
	const safeExpenses = expenses || [];

	if (isLoading) {
		return (
			<WidgetCard title='Dépenses du mois'>
				<p role='status' className='flex items-center gap-2 py-4 text-sm text-neutral-600'>
					<Loader2 className='size-5 animate-spin text-accent-600' aria-hidden='true' />
					Chargement des dépenses…
				</p>
			</WidgetCard>
		);
	}

	return (
		<WidgetCard
			title='Dépenses du mois'
			subtitle={`${safeExpenses.length} dépense${safeExpenses.length > 1 ? 's' : ''} enregistrée${safeExpenses.length > 1 ? 's' : ''}`}>
			{safeExpenses.length === 0 ? (
				<div className='flex items-center gap-3 rounded-md bg-neutral-50 p-4'>
					<Receipt className='size-6 shrink-0 text-neutral-600' aria-hidden='true' />
					<p className='text-sm text-neutral-700'>
						Les dépenses apparaissent ici quand vous ajoutez des produits avec un prix
						d’achat.
					</p>
				</div>
			) : (
				<ul className='divide-y divide-neutral-200'>
					{safeExpenses.map((expense) => (
						<li key={expense.id} className='flex items-center gap-3 py-3'>
							<span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-neutral-50 text-neutral-700'>
								<Receipt className='size-5' aria-hidden='true' />
							</span>
							<div className='min-w-0 flex-1'>
								<p className='truncate font-medium text-neutral-900'>
									{expense.notes || 'Dépense'}
								</p>
								<p className='truncate text-sm text-neutral-600'>
									<time dateTime={expense.date}>{formatDay(expense.date)}</time>
									{' · '}
									{expense.category || 'Autre'}
									{expense.source ? ` · ${expense.source}` : ''}
								</p>
							</div>
							<p className='shrink-0 font-medium tabular-nums text-neutral-900'>
								{expense.amount ? formatAmount(expense.amount) : '–'}
							</p>
						</li>
					))}
				</ul>
			)}
		</WidgetCard>
	);
};

export default ExpenseList;
