import { FC, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';

// ===== IMPORTS SCHÉMAS =====
import {
	formatCurrency,
	formatBudgetPeriod,
	type Expense,
	type Budget,
	type BudgetStats,
	type BudgetAlert,
} from '@/schemas/budget';

// ===== IMPORTS SERVICES =====
import { budgetService } from '@/services/budgetService';

// ===== IMPORTS COMPOSANTS UI =====
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

// ===== IMPORTS ICÔNES =====
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
} from 'lucide-react';

// ===== COMPOSANT ÉDITION BUDGET =====
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

	const handleUpdateBudget = async () => {
		const budgetAmount = parseFloat(amount);

		if (!budgetAmount || budgetAmount <= 0) {
			setError('Veuillez saisir un montant valide');
			return;
		}

		setIsUpdating(true);
		setError(null);

		try {
			await budgetService.updateBudget(budget.id, {
				amount: budgetAmount,
			});
			setIsOpen(false);
			onBudgetUpdated();
		} catch (error) {
			console.error('Erreur modification budget:', error);
			setError('Erreur lors de la modification du budget');
		} finally {
			setIsUpdating(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			// Reset le formulaire quand on ferme
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
						{formatBudgetPeriod(budget)}.
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4'>
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
						<Alert variant='destructive'>
							<AlertTriangle className='size-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className='bg-neutral-100 p-3 rounded-md'>
						<div className='flex justify-between text-sm'>
							<span>Montant actuel :</span>
							<span className='font-semibold'>
								{formatCurrency(budget.amount)}
							</span>
						</div>
						{parseFloat(amount) > 0 &&
							parseFloat(amount) !== budget.amount && (
								<div className='flex justify-between text-sm mt-1'>
									<span>Nouveau montant :</span>
									<span className='font-semibold text-accent'>
										{formatCurrency(parseFloat(amount))}
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
	const [error, setError] = useState<string | null>(null);

	const handleCreateBudget = async () => {
		const budgetAmount = parseFloat(amount);

		if (!budgetAmount || budgetAmount <= 0) {
			setError('Veuillez saisir un montant valide');
			return;
		}

		setIsCreating(true);
		setError(null);

		try {
			await budgetService.createMonthlyBudget(budgetAmount);
			setAmount('');
			onBudgetCreated();
		} catch (error) {
			console.error('Erreur création budget:', error);
			setError('Erreur lors de la création du budget');
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Plus className='size-5 text-accent' />
					Créer votre budget mensuel
				</CardTitle>
			</CardHeader>

			<CardContent className='space-y-4'>
				<div className='text-center space-y-2'>
					<div className='text-4xl'>💰</div>
					<h3 className='font-semibold'>Aucun budget défini</h3>
					<p className='text-neutral-200 text-sm'>
						Créez votre budget mensuel pour suivre vos dépenses
						alimentaires
					</p>
				</div>

				<div className='space-y-3'>
					<div className='space-y-2'>
						<label
							htmlFor='budget-amount'
							className='text-sm font-medium'>
							Montant mensuel (€)
						</label>
						<Input
							id='budget-amount'
							type='number'
							placeholder='Ex: 300'
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							min='1'
							step='1'
							disabled={isCreating}
						/>
					</div>

					{error && (
						<Alert variant='destructive'>
							<AlertTriangle className='size-4' />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Button
						onClick={handleCreateBudget}
						disabled={
							!amount || parseFloat(amount) <= 0 || isCreating
						}
						className='w-full'>
						{isCreating ? (
							<>
								<Loader2 className='size-4 mr-2 animate-spin' />
								Création en cours...
							</>
						) : (
							<>
								<Plus className='size-4 mr-2' />
								Créer mon budget
							</>
						)}
					</Button>
				</div>

				<div className='text-xs text-neutral-200 text-center'>
					💡 Votre budget sera automatiquement reconduit chaque mois
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
					<p className='text-2xl font-bold'>
						{formatCurrency(budget.amount)}
					</p>
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
						{formatCurrency(stats.totalSpent)}
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
						{formatCurrency(stats.remaining)}
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
							? 'destructive'
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
	// Protection contre expenses undefined
	const safeExpenses = expenses || [];

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
											? formatCurrency(expense.amount)
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
	// ===== ÉTATS =====
	const [budget, setBudget] = useState<Budget | null>(null);
	const [budgetStats, setBudgetStats] = useState<BudgetStats | null>(null);
	const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// ===== FONCTIONS =====
	const loadCurrentBudget = async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Utiliser directement /budget/current comme dans le BudgetWidget
			const currentBudgetData = await budgetService.getCurrentBudget();

			// Vérifier si data est null (pas de budget)
			if (!currentBudgetData || !currentBudgetData.budget) {
				setBudget(null);
				setBudgetStats(null);
				setBudgetAlerts([]);
				setExpenses([]);
				return;
			}

			setBudget(currentBudgetData.budget);
			setBudgetStats(currentBudgetData.stats);

			// Récupérer les alertes séparément
			const alerts = await budgetService.getBudgetAlerts(
				currentBudgetData.budget.id
			);
			setBudgetAlerts(alerts);

			// Récupérer les dépenses de ce budget
			loadExpenses(currentBudgetData.budget.id);
		} catch (error) {
			console.error('Erreur lors du chargement du budget:', error);
			// En cas d'erreur, afficher le formulaire de création
			setBudget(null);
			setBudgetStats(null);
			setBudgetAlerts([]);
			setExpenses([]);
		} finally {
			setIsLoading(false);
		}
	};

	const loadExpenses = async (budgetId: string) => {
		try {
			setIsLoadingExpenses(true);
			const expensesData = await budgetService.getExpensesByBudget(
				budgetId
			);
			setExpenses(expensesData.items);
		} catch (error) {
			console.error('Erreur lors du chargement des dépenses:', error);
			setExpenses([]);
		} finally {
			setIsLoadingExpenses(false);
		}
	};

	const handleBudgetCreated = () => {
		loadCurrentBudget();
	};

	// ===== EFFECTS =====
	useEffect(() => {
		loadCurrentBudget();
	}, []);

	// ===== RENDU =====
	return (
		<div className='max-w-7xl mx-auto p-6 space-y-6'>
			{/* ===== HEADER ===== */}
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

				{budget && (
					<div className='flex items-center gap-4'>
						<div className='flex items-center gap-2 text-neutral-200'>
							<Calendar className='size-4' />
							<span>{formatBudgetPeriod(budget)}</span>
						</div>
						<EditBudgetDialog budget={budget} onBudgetUpdated={loadCurrentBudget} />
					</div>
				)}
			</div>

			{/* ===== GESTION D'ERREUR ===== */}
			{error && (
				<Alert variant='destructive'>
					<AlertTriangle className='size-4' />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* ===== CONTENU PRINCIPAL ===== */}
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
			) : !budget || !budgetStats ? (
				// Aucun budget - Afficher l'invitation à créer
				<CreateBudgetSection onBudgetCreated={handleBudgetCreated} />
			) : (
				// Budget existant - Afficher l'interface complète
				<div className='space-y-6'>
					{/* Alertes */}
					<BudgetAlerts alerts={budgetAlerts} />

					{/* Statistiques */}
					<BudgetStatsCards budget={budget} stats={budgetStats} />

					{/* Liste des dépenses */}
					<ExpenseList
						expenses={expenses}
						isLoading={isLoadingExpenses}
					/>
				</div>
			)}
		</div>
	);
};