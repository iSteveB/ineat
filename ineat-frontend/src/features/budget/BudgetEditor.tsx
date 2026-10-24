import WidgetCard from "@/components/common/WidgetCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Budget } from "@/schemas";
import { isValidBudget } from "@/schemas/budget";
import { budgetService } from "@/services/budgetService";
import useBudgetStore from "@/stores/budgetStore";
import { CircleAlert, Info, Loader2, PencilLine, Plus } from "lucide-react";
import { FC, FormEvent, useState, useMemo, useEffect, useCallback, useId } from "react";

const CreateBudget: FC<{ onBudgetCreated: () => void; month: string }> = ({
	onBudgetCreated,
	month,
}) => {
	const [amount, setAmount] = useState<string>('');
	const [isCreating, setIsCreating] = useState(false);
	const [isCheckingExisting, setIsCheckingExisting] = useState(false);
	const [existingBudget, setExistingBudget] = useState<Budget | null>(null);
	const [error, setError] = useState<string | null>(null);
	const { createMonthlyBudget, updateBudget } = useBudgetStore();
	const errorId = useId();

	const safeExistingBudgetAmount = useMemo(() => {
		if (!existingBudget || !isValidBudget(existingBudget)) {
			return null;
		}

		try {
			return budgetService.formatCurrency(existingBudget.amount);
		} catch {
			return `${existingBudget.amount}€`;
		}
	}, [existingBudget]);

	const checkExistingBudget = useCallback(async () => {
		setIsCheckingExisting(true);
		try {
			const response = await budgetService.getBudgetByMonth(month);
			if (response?.budget && isValidBudget(response.budget)) {
				setExistingBudget(response.budget);
				setAmount(response.budget.amount.toString());
			}
		} catch {
			// Silently fail
		} finally {
			setIsCheckingExisting(false);
		}
	}, [month]);

	useEffect(() => {
		checkExistingBudget();
	}, [checkExistingBudget]);

	const handleCreateOrUpdateBudget = async (event: FormEvent) => {
		event.preventDefault();
		const budgetAmount = parseFloat(amount);

		if (!budgetAmount || budgetAmount <= 0) {
			setError('Veuillez saisir un montant valide');
			return;
		}

		setIsCreating(true);
		setError(null);

		try {
			if (existingBudget) {
				await updateBudget(existingBudget.id, { amount: budgetAmount });
			} else {
				const [year, monthNumber] = month.split('-').map(Number);
				await createMonthlyBudget(budgetAmount, {
					year,
					month: monthNumber - 1,
				});
			}

			setAmount('');
			onBudgetCreated();
		} catch {
			setError('Erreur lors de la sauvegarde du budget');
		} finally {
			setIsCreating(false);
		}
	};

	if (isCheckingExisting) {
		return (
			<WidgetCard title='Budget du mois'>
				<p role='status' className='flex items-center gap-2 py-4 text-sm text-neutral-600'>
					<Loader2 className='size-5 animate-spin text-accent-600' aria-hidden='true' />
					Vérification d’un budget existant…
				</p>
			</WidgetCard>
		);
	}

	const isUnchanged = Boolean(existingBudget && parseFloat(amount) === existingBudget.amount);

	return (
		<WidgetCard
			title={existingBudget ? 'Modifier votre budget' : 'Définir votre budget'}
			subtitle={
				existingBudget
					? undefined
					: 'Fixez un montant mensuel pour suivre vos dépenses alimentaires.'
			}>
			<form onSubmit={handleCreateOrUpdateBudget} className='flex max-w-md flex-col gap-4'>
				{existingBudget && (
					<Alert variant='info' role='status'>
						<Info aria-hidden='true' />
						<AlertDescription>
							<p>
								Montant actuel :{' '}
								<strong className='text-neutral-900'>
									{safeExistingBudgetAmount || `${existingBudget.amount} €`}
								</strong>
								. Vos dépenses sont conservées.
							</p>
						</AlertDescription>
					</Alert>
				)}

				<div className='flex flex-col gap-1.5'>
					<label htmlFor='budget-amount' className='text-sm font-medium text-neutral-900'>
						{existingBudget ? 'Nouveau montant mensuel' : 'Montant mensuel'}
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
						<span aria-hidden='true' className='absolute right-3 top-1/2 -translate-y-1/2 font-medium text-neutral-600'>
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

				<Button
					type='submit'
					disabled={!amount || parseFloat(amount) <= 0 || isCreating || isUnchanged}>
					{isCreating ? (
						<Loader2 className='animate-spin' aria-hidden='true' />
					) : existingBudget ? (
						<PencilLine aria-hidden='true' />
					) : (
						<Plus aria-hidden='true' />
					)}
					{isCreating
						? 'Enregistrement…'
						: existingBudget
							? 'Modifier mon budget'
							: 'Créer mon budget'}
				</Button>

				<p className='text-sm text-neutral-600'>
					{existingBudget
						? 'La modification ne touche qu’au montant.'
						: 'Le budget est reconduit automatiquement chaque mois.'}
				</p>
			</form>
		</WidgetCard>
	);
};

export default CreateBudget;
