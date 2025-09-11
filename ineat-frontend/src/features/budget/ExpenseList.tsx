import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
} from '@/components/ui/table';
import { Expense } from '@/schemas';
import { budgetService } from '@/services/budgetService';
import { Loader2, ShoppingCart, Plus } from 'lucide-react';
import { FC, useCallback } from 'react';

interface ExpenseListProps {
	expenses: Expense[];
	isLoading: boolean;
}

const ExpenseList: FC<ExpenseListProps> = ({ expenses, isLoading }) => {
	const safeExpenses = expenses || [];

	const formatExpenseAmount = useCallback((amount: number) => {
		try {
			return budgetService.formatCurrency(amount);
		} catch {
			return `${amount}€`;
		}
	}, []);

	if (isLoading) {
		return (
			<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-blue-50/50 shadow-xl'>
				<CardContent className='flex items-center justify-center py-12'>
					<div className='text-center space-y-2'>
						<Loader2 className='size-8 animate-spin mx-auto text-accent' />
						<p className='text-gray-700 font-medium'>
							Chargement des dépenses...
						</p>
						<p className='text-sm text-gray-500 mt-1'>
							Récupération des informations détaillées
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className='relative pb-16 overflow-hidden border-0 bg-gradient-to-br from-white to-blue-50/50 shadow-xl'>
			<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-indigo-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

			<CardHeader className='relative z-10'>
				<CardTitle className='flex items-center gap-3 mb-6'>
					<div className='p-2 rounded-xl bg-blue-50 border border-blue-200'>
						<ShoppingCart className='size-5 text-blue-600' />
					</div>
					<div>
						<h3 className='font-bold text-gray-900'>
							Dépenses du mois
						</h3>
						<p className='text-sm text-gray-600'>
							({safeExpenses.length} dépenses enregistrées)
						</p>
					</div>
				</CardTitle>
			</CardHeader>

			<CardContent className='relative z-10'>
				{safeExpenses.length === 0 ? (
					<div className='flex flex-col items-center justify-center h-64 text-center pt-22'>
						<div className='relative mb-8'>
							<div className='size-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center'>
								<ShoppingCart className='size-10 text-gray-400' />
							</div>
							<div className='absolute -top-2 -right-2 size-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg'>
								<Plus className='size-4 text-neutral-50' />
							</div>
						</div>
						<div className='space-y-3'>
							<h3 className='text-xl font-bold text-gray-900'>
								Aucune dépense enregistrée
							</h3>
							<p className='text-gray-600 max-w-md'>
								Les dépenses apparaîtront ici lorsque vous
								ajouterez des produits avec un prix d'achat.
							</p>
						</div>
					</div>
				) : (
					<div className='overflow-x-auto'>
						<Table>
							<TableHeader>
								<TableRow className='bg-gray-50'>
									<TableHead className='text-gray-700'>
										Date
									</TableHead>
									<TableHead className='text-gray-700 w-48'>
										Article
									</TableHead>
									<TableHead className='text-right text-gray-700'>
										Prix
									</TableHead>
									<TableHead className='text-gray-700'>
										Catégorie
									</TableHead>
									<TableHead className='text-gray-700'>
										Source
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{safeExpenses.map((expense) => (
									<TableRow
										key={expense.id}
										className='hover:bg-gray-50 transition-colors'>
										<TableCell className='py-3'>
											{new Date(
												expense.date
											).toLocaleDateString('fr-FR')}
										</TableCell>
										<TableCell
											className='w-48 max-w-48 truncate py-3 text-gray-700'
											title={expense.notes || '-'}>
											{expense.notes || '-'}
										</TableCell>
										<TableCell className='text-right font-bold text-gray-900 py-3'>
											{expense.amount
												? formatExpenseAmount(
														expense.amount
												  )
												: '-'}
										</TableCell>
										<TableCell className='py-3'>
											<span className='px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium'>
												{expense.category || 'Autre'}
											</span>
										</TableCell>
										<TableCell className='py-3'>
											{expense.source || 'Non spécifié'}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default ExpenseList;
