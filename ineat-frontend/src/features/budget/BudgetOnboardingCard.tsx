import { FC, FormEvent, useId, useState } from 'react';
import { CircleAlert, Loader2, Wallet } from 'lucide-react';

import WidgetCard from '@/components/common/WidgetCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useBudgetStore from '@/stores/budgetStore';

const BudgetOnboardingCard: FC = () => {
	const [amount, setAmount] = useState<string>('');
	const [isCreating, setIsCreating] = useState(false);
	const { createMonthlyBudget, error } = useBudgetStore();
	const errorId = useId();

	const budgetAmount = Number.parseFloat(amount);
	const isValidAmount = Boolean(budgetAmount) && budgetAmount > 0;

	const handleCreateBudget = async (event: FormEvent) => {
		event.preventDefault();

		if (!isValidAmount || isCreating) {
			return;
		}

		setIsCreating(true);
		try {
			await createMonthlyBudget(budgetAmount);
			setAmount('');
		} catch (error) {
			console.error('Erreur création budget:', error);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<WidgetCard
			title='Budget'
			subtitle='Définissez un budget mensuel pour suivre vos dépenses alimentaires.'>
			<form onSubmit={handleCreateBudget} className='flex flex-col gap-3'>
				<div className='flex flex-col gap-1.5'>
					<label htmlFor='budget-amount' className='text-sm font-medium text-neutral-900'>
						Montant mensuel
					</label>
					<div className='relative'>
						<Input
							id='budget-amount'
							type='number'
							inputMode='decimal'
							placeholder='Ex. 300'
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							min='1'
							step='1'
							disabled={isCreating}
							aria-invalid={Boolean(error)}
							aria-describedby={error ? errorId : undefined}
							className='h-12 pr-10'
						/>
						<span
							aria-hidden='true'
							className='absolute right-3 top-1/2 -translate-y-1/2 font-medium text-neutral-600'>
							€
						</span>
					</div>
					{error && (
						<p id={errorId} className='flex items-center gap-1.5 text-sm text-danger-700'>
							<CircleAlert className='size-4 shrink-0' aria-hidden='true' />
							{error}
						</p>
					)}
				</div>

				<Button type='submit' disabled={!isValidAmount || isCreating}>
					{isCreating ? (
						<>
							<Loader2 className='animate-spin' aria-hidden='true' />
							Création en cours…
						</>
					) : (
						<>
							<Wallet aria-hidden='true' />
							Créer mon budget
						</>
					)}
				</Button>

				<p className='text-sm text-neutral-600'>
					Le budget est reconduit automatiquement chaque mois.
				</p>
			</form>
		</WidgetCard>
	);
};

export default BudgetOnboardingCard;
