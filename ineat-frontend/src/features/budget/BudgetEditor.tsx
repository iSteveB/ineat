import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Budget } from "@/schemas";
import { isValidBudget } from "@/schemas/budget";
import { budgetService } from "@/services/budgetService";
import useBudgetStore from "@/stores/budgetStore";
import { Loader2, Edit, Plus, Info, AlertTriangle } from "lucide-react";
import { FC, useState, useMemo, useEffect } from "react";

const CreateBudget: FC<{ onBudgetCreated: () => void }> = ({
	onBudgetCreated,
}) => {
	const [amount, setAmount] = useState<string>('');
	const [isCreating, setIsCreating] = useState(false);
	const [isCheckingExisting, setIsCheckingExisting] = useState(false);
	const [existingBudget, setExistingBudget] = useState<Budget | null>(null);
	const [error, setError] = useState<string | null>(null);
	const { createMonthlyBudget, updateBudget } = useBudgetStore();

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

	const checkExistingBudget = async () => {
		setIsCheckingExisting(true);
		try {
			const response = await budgetService.getCurrentBudget();
			if (response.budget && isValidBudget(response.budget)) {
				setExistingBudget(response.budget);
				setAmount(response.budget.amount.toString());
			}
		} catch {
			// Silently fail
		} finally {
			setIsCheckingExisting(false);
		}
	};

	useEffect(() => {
		checkExistingBudget();
	}, []);

	const handleCreateOrUpdateBudget = async () => {
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
				await createMonthlyBudget(budgetAmount);
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
			<Card>
				<CardContent className='flex items-center justify-center py-12'>
					<div className='text-center space-y-2'>
						<Loader2 className='size-8 animate-spin mx-auto text-accent' />
						<p className='text-neutral-200'>
							Vérification d'un budget existant...
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					{existingBudget ? (
						<>
							<Edit className='size-5 text-accent' />
							Modifier votre budget mensuel
						</>
					) : (
						<>
							<Plus className='size-5 text-accent' />
							Créer votre budget mensuel
						</>
					)}
				</CardTitle>
			</CardHeader>

			<CardContent className='space-y-4'>
				{existingBudget ? (
					<Alert className='border-primary-100 bg-primary-50/50'>
						<Edit className='size-4 text-primary-100' />
						<AlertDescription className='text-neutral-300'>
							<strong>
								Budget existant détecté pour cette période
							</strong>
							<br />
							Montant actuel :{' '}
							<strong>
								{safeExistingBudgetAmount ||
									`${existingBudget.amount}€`}
							</strong>
							<br />
							<span className='text-sm text-neutral-200'>
								✅ La modification conservera toutes vos
								dépenses actuelles.
							</span>
						</AlertDescription>
					</Alert>
				) : (
					<>
						<div className='text-center space-y-2'>
							<div className='text-4xl'>💰</div>
							<h3 className='font-semibold'>
								Aucun budget défini
							</h3>
							<p className='text-neutral-200 text-sm'>
								Créez votre budget mensuel pour suivre vos
								dépenses alimentaires
							</p>
						</div>

						<Alert className='border-accent/20 bg-accent/10'>
							<Info className='size-4 text-accent' />
							<AlertDescription className='text-neutral-300'>
								<strong>Nouveau budget</strong> - Aucun budget
								n'existe pour cette période.
							</AlertDescription>
						</Alert>
					</>
				)}

				<div className='space-y-3'>
					<div className='space-y-2'>
						<label
							htmlFor='budget-amount'
							className='text-sm font-medium'>
							{existingBudget
								? 'Nouveau montant (€)'
								: 'Montant mensuel (€)'}
						</label>
						<Input
							id='budget-amount'
							type='number'
							placeholder={
								existingBudget
									? `Actuel: ${existingBudget.amount}€`
									: 'Ex: 300'
							}
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							min='1'
							step='1'
							disabled={isCreating}
						/>
					</div>

					{error && (
						<Alert variant='warning'>
							<AlertTriangle className='size-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Button
						onClick={handleCreateOrUpdateBudget}
						disabled={
							!amount ||
							parseFloat(amount) <= 0 ||
							isCreating ||
							!!(
								existingBudget &&
								parseFloat(amount) === existingBudget.amount
							)
						}
						className='w-full'>
						{isCreating ? (
							<>
								<Loader2 className='size-4 mr-2 animate-spin' />
								{existingBudget
									? 'Modification...'
									: 'Création en cours...'}
							</>
						) : (
							<>
								{existingBudget ? (
									<>
										<Edit className='size-4 mr-2' />
										Modifier mon budget
									</>
								) : (
									<>
										<Plus className='size-4 mr-2' />
										Créer mon budget
									</>
								)}
							</>
						)}
					</Button>
				</div>

				<div className='text-xs text-neutral-200 text-center'>
					💡{' '}
					{existingBudget
						? 'La modification préservera toutes vos dépenses existantes'
						: 'Votre budget sera automatiquement reconduit chaque mois'}
				</div>
			</CardContent>
		</Card>
	);
};

export default CreateBudget;