import { FC, useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from '@tanstack/react-router';

import {
	type Expense,
	type Budget,
	type BudgetStats,
	type BudgetAlert,
	type UpdateBudgetData,
	isValidBudget,
} from '@/schemas/budget';

import { useBudgetStore } from '@/stores/budgetStore';
import { budgetService } from '@/services/budgetService';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

import {
	TrendingUp,
	TrendingDown,
	Euro,
	ShoppingCart,
	AlertTriangle,
	Plus,
	Loader2,
	ArrowLeft,
	PieChart,
	Calendar,
	Edit,
	CheckCircle,
	Info,
} from 'lucide-react';

interface EditBudgetDialogProps {
	budget: Budget;
	onBudgetUpdated: () => void;
}

const EditBudgetDialog: FC<EditBudgetDialogProps> = ({
	budget,
	onBudgetUpdated,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [amount, setAmount] = useState<string>(budget.amount.toString());
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { updateBudget } = useBudgetStore();

	const safeBudgetPeriod = useMemo(() => {
		if (!budget || !isValidBudget(budget)) {
			return 'Période non définie';
		}

		try {
			return budgetService.formatBudgetPeriod(budget);
		} catch {
			return 'Erreur de formatage';
		}
	}, [budget]);

	const handleUpdateBudget = async () => {
		const budgetAmount = parseFloat(amount);

		if (!budgetAmount || budgetAmount <= 0) {
			setError('Veuillez saisir un montant valide');
			return;
		}

		if (budgetAmount === budget.amount) {
			setError('Le montant est identique au montant actuel');
			return;
		}

		setIsUpdating(true);
		setError(null);

		try {
			const updateData: UpdateBudgetData = {
				amount: budgetAmount,
			};

			await updateBudget(budget.id, updateData);
			setIsOpen(false);
			onBudgetUpdated();
		} catch {
			setError('Erreur lors de la modification du budget');
		} finally {
			setIsUpdating(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			setAmount(budget.amount.toString());
			setError(null);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant='outline' size='sm'>
					<Edit className='size-4 mr-2' />
					Modifier le budget
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Edit className='size-5 text-accent' />
						Modifier le budget
					</DialogTitle>
					<DialogDescription>
						Modifiez le montant de votre budget mensuel pour{' '}
						{safeBudgetPeriod}.
						<br />
						<span className='text-success-50 text-sm'>
							✅ Toutes vos dépenses actuelles seront conservées.
						</span>
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4'>
					<Alert className='border-success-50/20 bg-success-50/10'>
						<CheckCircle className='size-4 text-success-50' />
						<AlertDescription className='text-neutral-300'>
							<strong>Modification sécurisée :</strong> Cette
							action modifie uniquement le montant de votre
							budget. Toutes vos dépenses existantes restent
							intactes.
						</AlertDescription>
					</Alert>

					<div className='space-y-2'>
						<label
							htmlFor='edit-budget-amount'
							className='text-sm font-medium'>
							Nouveau montant (€)
						</label>
						<Input
							id='edit-budget-amount'
							type='number'
							placeholder='Ex: 350'
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							min='1'
							step='1'
							disabled={isUpdating}
						/>
					</div>

					{error && (
						<Alert variant='warning'>
							<AlertTriangle className='size-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className='bg-neutral-100 p-3 rounded-md'>
						<div className='flex justify-between text-sm'>
							<span>Montant actuel :</span>
							<span className='font-semibold'>
								{budgetService.formatCurrency(budget.amount)}
							</span>
						</div>
						{parseFloat(amount) > 0 &&
							parseFloat(amount) !== budget.amount && (
								<div className='flex justify-between text-sm mt-1'>
									<span>Nouveau montant :</span>
									<span className='font-semibold text-accent'>
										{budgetService.formatCurrency(
											parseFloat(amount)
										)}
									</span>
								</div>
							)}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant='outline'
						onClick={() => setIsOpen(false)}
						disabled={isUpdating}>
						Annuler
					</Button>
					<Button
						onClick={handleUpdateBudget}
						disabled={
							!amount ||
							parseFloat(amount) <= 0 ||
							isUpdating ||
							parseFloat(amount) === budget.amount
						}>
						{isUpdating ? (
							<>
								<Loader2 className='size-4 mr-2 animate-spin' />
								Modification...
							</>
						) : (
							<>
								<Edit className='size-4 mr-2' />
								Modifier
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

// ===== COMPOSANT CRÉATION BUDGET =====
const CreateBudgetSection: FC<{ onBudgetCreated: () => void }> = ({
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

// ===== COMPOSANT STATISTIQUES BUDGET =====
interface BudgetStatsCardsProps {
	budget: Budget;
	stats: BudgetStats;
}

const BudgetStatsCards: FC<BudgetStatsCardsProps> = ({ budget, stats }) => {
	const safeBudgetAmount = useMemo(() => {
		try {
			return budgetService.formatCurrency(budget.amount);
		} catch {
			return `${budget.amount}€`;
		}
	}, [budget.amount]);

	const safeTotalSpent = useMemo(() => {
		try {
			return budgetService.formatCurrency(stats.totalSpent);
		} catch {
			return `${stats.totalSpent}€`;
		}
	}, [stats.totalSpent]);

	const safeRemaining = useMemo(() => {
		try {
			return budgetService.formatCurrency(stats.remaining);
		} catch {
			return `${stats.remaining}€`;
		}
	}, [stats.remaining]);

	return (
		<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
			<Card>
				<CardContent className='p-4'>
					<div className='flex items-center gap-2 mb-1'>
						<Euro className='size-4 text-accent' />
						<span className='text-sm text-neutral-200'>
							Budget total
						</span>
					</div>
					<p className='text-2xl font-bold'>{safeBudgetAmount}</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className='p-4'>
					<div className='flex items-center gap-2 mb-1'>
						<TrendingDown className='size-4 text-error-100' />
						<span className='text-sm text-neutral-200'>
							Dépensé
						</span>
					</div>
					<p className='text-2xl font-bold text-error-100'>
						{safeTotalSpent}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className='p-4'>
					<div className='flex items-center gap-2 mb-1'>
						<TrendingUp className='size-4 text-success-50' />
						<span className='text-sm text-neutral-200'>
							Restant
						</span>
					</div>
					<p className='text-2xl font-bold text-success-50'>
						{safeRemaining}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className='p-4'>
					<div className='flex items-center gap-2 mb-1'>
						<PieChart className='size-4 text-warning-50' />
						<span className='text-sm text-neutral-200'>
							Utilisé
						</span>
					</div>
					<p className='text-2xl font-bold text-warning-50'>
						{Math.round(stats.percentageUsed)}%
					</p>
				</CardContent>
			</Card>
		</div>
	);
};

// ===== COMPOSANT ALERTES BUDGET =====
interface BudgetAlertsProps {
	alerts: BudgetAlert[];
}

const BudgetAlerts: FC<BudgetAlertsProps> = ({ alerts }) => {
	if (alerts.length === 0) return null;

	return (
		<div className='space-y-2'>
			{alerts.map((alert) => (
				<Alert
					key={alert.id}
					variant={
						alert.severity === 'CRITICAL'
							? 'warning'
							: 'default'
					}>
					<AlertTriangle className='size-4' />
					<AlertDescription>
						<strong>{alert.title}</strong>
						<br />
						{alert.message}
						{alert.suggestions && alert.suggestions.length > 0 && (
							<div className='mt-2'>
								<strong>Suggestions:</strong>
								<ul className='list-disc list-inside mt-1'>
									{alert.suggestions.map(
										(suggestion, index) => (
											<li key={index} className='text-sm'>
												{suggestion}
											</li>
										)
									)}
								</ul>
							</div>
						)}
					</AlertDescription>
				</Alert>
			))}
		</div>
	);
};

// ===== COMPOSANT LISTE DES DÉPENSES =====
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
			<Card>
				<CardContent className='flex items-center justify-center py-8'>
					<div className='text-center space-y-2'>
						<Loader2 className='size-8 animate-spin mx-auto text-accent' />
						<p className='text-neutral-200'>
							Chargement des dépenses...
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
					<ShoppingCart className='size-5 text-accent' />
					Dépenses du mois ({safeExpenses.length})
				</CardTitle>
			</CardHeader>

			<CardContent>
				{safeExpenses.length === 0 ? (
					<div className='text-center py-8'>
						<ShoppingCart className='size-12 mx-auto text-neutral-200 mb-4' />
						<h3 className='font-semibold mb-2'>Aucune dépense</h3>
						<p className='text-neutral-200 text-sm'>
							Les dépenses apparaîtront ici lorsque vous ajouterez
							des produits avec un prix.
						</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Source</TableHead>
								<TableHead>Catégorie</TableHead>
								<TableHead>Notes</TableHead>
								<TableHead className='text-right'>
									Montant
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{safeExpenses.map((expense) => (
								<TableRow key={expense.id}>
									<TableCell>
										{new Date(
											expense.date
										).toLocaleDateString('fr-FR')}
									</TableCell>
									<TableCell>
										{expense.source || 'Non spécifié'}
									</TableCell>
									<TableCell>
										<span className='px-2 py-1 bg-neutral-100 rounded-md text-xs'>
											{expense.category || 'Autre'}
										</span>
									</TableCell>
									<TableCell className='max-w-xs truncate'>
										{expense.notes || '-'}
									</TableCell>
									<TableCell className='text-right font-semibold'>
										{expense.amount
											? formatExpenseAmount(
													expense.amount
											  )
											: '-'}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
};

// ===== COMPOSANT PAGE BUDGET PRINCIPAL =====
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
		<div className='max-w-7xl mx-auto p-6 space-y-6'>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-4'>
					<Link to='/app'>
						<Button variant='ghost' size='sm'>
							<ArrowLeft className='size-4 mr-2' />
							Retour au dashboard
						</Button>
					</Link>
					<h1 className='text-2xl font-bold'>Budget mensuel</h1>
				</div>

				{currentBudget && isValidBudget(currentBudget) && (
					<div className='flex items-center gap-4'>
						<div className='flex items-center gap-2 text-neutral-200'>
							<Calendar className='size-4' />
							<span>
								{safeBudgetPeriod || 'Période non disponible'}
							</span>
						</div>
						<EditBudgetDialog
							budget={currentBudget}
							onBudgetUpdated={handleBudgetCreated}
						/>
					</div>
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
			) : !currentBudget ||
			  !budgetStats ||
			  !isValidBudget(currentBudget) ? (
				<CreateBudgetSection onBudgetCreated={handleBudgetCreated} />
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
	);
};
