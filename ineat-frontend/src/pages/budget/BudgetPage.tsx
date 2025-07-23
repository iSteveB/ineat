import { FC, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';

// ===== IMPORTS STORE =====
import { useBudgetStore } from '@/stores/budgetStore';

// ===== IMPORTS SCHÉMAS =====
import { 
	formatCurrency, 
	formatBudgetPeriod, 
	getMonthString, 
	parseMonthString,
	type Expense,
	type Budget,
	type BudgetStats,
} from '@/schemas/budget';

// ===== IMPORTS COMPOSANTS UI =====
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
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
	ChevronLeft,
	ChevronRight,
	Calendar,
	TrendingUp,
	TrendingDown,
	Euro,
	ShoppingCart,
	AlertTriangle,
	Plus,
	Loader2,
	ArrowLeft,
	Edit,
	PieChart,
} from 'lucide-react';

// ===== COMPOSANT SÉLECTEUR DE MOIS =====
interface MonthSelectorProps {
	selectedMonth: string;
	onMonthChange: (month: string) => void;
	budgetHistory: Budget[];
}

const MonthSelector: FC<MonthSelectorProps> = ({
	selectedMonth,
	onMonthChange,
	budgetHistory,
}) => {
	const currentDate = parseMonthString(selectedMonth);
	
	const navigateMonth = (direction: 'prev' | 'next') => {
		const newDate = new Date(currentDate);
		if (direction === 'prev') {
			newDate.setMonth(newDate.getMonth() - 1);
		} else {
			newDate.setMonth(newDate.getMonth() + 1);
		}
		onMonthChange(getMonthString(newDate));
	};

	const formatMonthDisplay = (monthStr: string): string => {
		const date = parseMonthString(monthStr);
		return new Intl.DateTimeFormat('fr-FR', {
			year: 'numeric',
			month: 'long',
		}).format(date);
	};

	return (
		<div className="flex items-center justify-between mb-6">
			<div className="flex items-center gap-4">
				<Button
					variant="outline"
					size="sm"
					onClick={() => navigateMonth('prev')}
				>
					<ChevronLeft className="size-4" />
				</Button>

				<div className="flex items-center gap-2">
					<Calendar className="size-5 text-accent" />
					<h2 className="text-xl font-semibold">
						{formatMonthDisplay(selectedMonth)}
					</h2>
				</div>

				<Button
					variant="outline"
					size="sm"
					onClick={() => navigateMonth('next')}
					disabled={selectedMonth >= getMonthString()} // Pas de navigation future
				>
					<ChevronRight className="size-4" />
				</Button>
			</div>

			{/* Sélecteur rapide pour l'historique */}
			{budgetHistory.length > 0 && (
				<Select value={selectedMonth} onValueChange={onMonthChange}>
					<SelectTrigger className="w-48">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{budgetHistory.map((budget) => {
							const monthStr = getMonthString(new Date(budget.periodStart));
							return (
								<SelectItem key={budget.id} value={monthStr}>
									{formatBudgetPeriod(budget)}
								</SelectItem>
							);
						})}
						{/* Ajouter le mois courant s'il n'est pas dans l'historique */}
						{!budgetHistory.some(b => getMonthString(new Date(b.periodStart)) === getMonthString()) && (
							<SelectItem value={getMonthString()}>
								{formatMonthDisplay(getMonthString())}
							</SelectItem>
						)}
					</SelectContent>
				</Select>
			)}
		</div>
	);
};

// ===== COMPOSANT CRÉATION BUDGET POUR LA PAGE =====
interface CreateBudgetForMonthProps {
	month: string;
	onBudgetCreated: () => void;
}

const CreateBudgetForMonth: FC<CreateBudgetForMonthProps> = ({
	month,
	onBudgetCreated,
}) => {
	const [amount, setAmount] = useState<string>('');
	const [isCreating, setIsCreating] = useState(false);
	const { createMonthlyBudget, error } = useBudgetStore();

	const handleCreateBudget = async () => {
		const budgetAmount = parseFloat(amount);
		
		if (!budgetAmount || budgetAmount <= 0) {
			return;
		}

		setIsCreating(true);
		try {
			await createMonthlyBudget(budgetAmount);
			setAmount('');
			onBudgetCreated();
		} catch (error) {
			console.error('Erreur création budget:', error);
		} finally {
			setIsCreating(false);
		}
	};

	const formatMonthDisplay = (monthStr: string): string => {
		const date = parseMonthString(monthStr);
		return new Intl.DateTimeFormat('fr-FR', {
			year: 'numeric',
			month: 'long',
		}).format(date);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Plus className="size-5 text-accent" />
					Créer le budget pour {formatMonthDisplay(month)}
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="text-center space-y-2">
					<div className="text-4xl">💰</div>
					<p className="text-neutral-200">
						Aucun budget défini pour ce mois
					</p>
				</div>

				<div className="space-y-3">
					<div className="space-y-2">
						<label htmlFor="budget-amount" className="text-sm font-medium">
							Montant mensuel (€)
						</label>
						<Input
							id="budget-amount"
							type="number"
							placeholder="Ex: 300"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							min="1"
							step="1"
							disabled={isCreating}
						/>
					</div>

					{error && (
						<Alert variant="destructive">
							<AlertTriangle className="size-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Button
						onClick={handleCreateBudget}
						disabled={!amount || parseFloat(amount) <= 0 || isCreating}
						className="w-full"
					>
						{isCreating ? (
							<>
								<Loader2 className="size-4 mr-2 animate-spin" />
								Création en cours...
							</>
						) : (
							<>
								<Plus className="size-4 mr-2" />
								Créer le budget
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};

// ===== COMPOSANT STATISTIQUES BUDGET =====
interface BudgetStatsCardProps {
	budget: Budget;
	stats: BudgetStats | null;
}

const BudgetStatsCard: FC<BudgetStatsCardProps> = ({ budget, stats }) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-2">
						<Euro className="size-4 text-accent" />
						<span className="text-sm text-neutral-200">Budget total</span>
					</div>
					<p className="text-2xl font-bold">{formatCurrency(budget.amount)}</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-2">
						<TrendingDown className="size-4 text-error-100" />
						<span className="text-sm text-neutral-200">Dépensé</span>
					</div>
					<p className="text-2xl font-bold text-error-100">
						{formatCurrency(stats?.totalSpent || 0)}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-2">
						<TrendingUp className="size-4 text-success-50" />
						<span className="text-sm text-neutral-200">Restant</span>
					</div>
					<p className="text-2xl font-bold text-success-50">
						{formatCurrency(stats?.remaining || budget.amount)}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-2">
						<PieChart className="size-4 text-warning-50" />
						<span className="text-sm text-neutral-200">Utilisé</span>
					</div>
					<p className="text-2xl font-bold text-warning-50">
						{Math.round(stats?.percentageUsed || 0)}%
					</p>
				</CardContent>
			</Card>
		</div>
	);
};

// ===== COMPOSANT LISTE DES DÉPENSES =====
interface ExpenseListProps {
	expenses: Expense[];
	isLoading: boolean;
}

const ExpenseList: FC<ExpenseListProps> = ({ expenses, isLoading }) => {
	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<div className="text-center space-y-2">
						<Loader2 className="size-8 animate-spin mx-auto text-accent" />
						<p className="text-neutral-200">Chargement des dépenses...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (expenses.length === 0) {
		return (
			<Card>
				<CardContent className="text-center py-8">
					<ShoppingCart className="size-12 mx-auto text-neutral-200 mb-4" />
					<h3 className="font-semibold mb-2">Aucune dépense ce mois</h3>
					<p className="text-neutral-200 text-sm">
						Les dépenses apparaîtront ici lorsque vous ajouterez des produits avec un prix.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ShoppingCart className="size-5 text-accent" />
					Dépenses du mois ({expenses.length})
				</CardTitle>
			</CardHeader>

			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Source</TableHead>
							<TableHead>Catégorie</TableHead>
							<TableHead>Notes</TableHead>
							<TableHead className="text-right">Montant</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{expenses.map((expense) => (
							<TableRow key={expense.id}>
								<TableCell>
									{new Date(expense.date).toLocaleDateString('fr-FR')}
								</TableCell>
								<TableCell>
									{expense.source || 'Non spécifié'}
								</TableCell>
								<TableCell>
									<span className="px-2 py-1 bg-neutral-100 rounded-md text-xs">
										{expense.category || 'Autre'}
									</span>
								</TableCell>
								<TableCell className="max-w-xs truncate">
									{expense.notes || '-'}
								</TableCell>
								<TableCell className="text-right font-semibold">
									{expense.amount ? formatCurrency(expense.amount) : '-'}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
};

// ===== COMPOSANT PAGE BUDGET PRINCIPAL =====
export const BudgetPage: FC = () => {
	const {
		selectedMonth,
		selectedBudget,
		expenses,
		budgetHistory,
		budgetStats,
		isLoading,
		isLoadingExpenses,
		error,
		setSelectedMonth,
		fetchBudgetByMonth,
		fetchBudgetHistory,
	} = useBudgetStore();

	// ===== EFFECTS =====
	useEffect(() => {
		// Charger l'historique des budgets au montage
		fetchBudgetHistory();
		
		// Charger le budget du mois sélectionné
		if (selectedMonth) {
			fetchBudgetByMonth(selectedMonth);
		}
	}, [fetchBudgetHistory, fetchBudgetByMonth, selectedMonth]);

	// ===== HANDLERS =====
	const handleMonthChange = (month: string) => {
		setSelectedMonth(month);
	};

	const handleBudgetCreated = () => {
		// Rafraîchir les données après création
		fetchBudgetByMonth(selectedMonth);
		fetchBudgetHistory();
	};

	// ===== RENDU =====
	return (
		<div className="max-w-7xl mx-auto p-6 space-y-6">
			{/* ===== HEADER AVEC NAVIGATION =====*/}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/app">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="size-4 mr-2" />
							Retour au dashboard
						</Button>
					</Link>
					<h1 className="text-2xl font-bold">Gestion du budget</h1>
				</div>

				{selectedBudget && (
					<Button variant="outline" size="sm">
						<Edit className="size-4 mr-2" />
						Modifier le budget
					</Button>
				)}
			</div>

			{/* ===== SÉLECTEUR DE MOIS ===== */}
			<MonthSelector
				selectedMonth={selectedMonth}
				onMonthChange={handleMonthChange}
				budgetHistory={budgetHistory}
			/>

			{/* ===== GESTION D'ERREUR ===== */}
			{error && (
				<Alert variant="destructive">
					<AlertTriangle className="size-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* ===== CONTENU PRINCIPAL ===== */}
			{isLoading ? (
				<Card>
					<CardContent className="flex items-center justify-center py-12">
						<div className="text-center space-y-2">
							<Loader2 className="size-8 animate-spin mx-auto text-accent" />
							<p className="text-neutral-200">Chargement du budget...</p>
						</div>
					</CardContent>
				</Card>
			) : !selectedBudget ? (
				// Aucun budget pour ce mois - Afficher l'invitation à créer
				<CreateBudgetForMonth
					month={selectedMonth}
					onBudgetCreated={handleBudgetCreated}
				/>
			) : (
				// Budget existant - Afficher les statistiques et dépenses
				<div className="space-y-6">
					{/* Statistiques du budget */}
					<BudgetStatsCard 
						budget={selectedBudget} 
						stats={budgetStats}
					/>

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