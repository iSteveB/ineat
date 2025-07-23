import { FC, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';

// ===== IMPORTS SCHÉMAS ZOD =====
import { BudgetStats } from '@/schemas';

// ===== IMPORTS STORE =====
import { useBudgetStore, useHasBudget } from '@/stores/budgetStore';

// ===== IMPORTS UTILITAIRES =====
import { formatPrice } from '@/utils/ui-utils';

// ===== IMPORTS COMPOSANTS UI =====
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, PlusCircle, TrendingUp, AlertTriangle } from 'lucide-react';

// ===== COMPOSANT CREATE BUDGET PROMPT =====
const CreateBudgetPrompt: FC = () => {
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
		} catch (error) {
			console.error('Erreur création budget:', error);
		} finally {
			setIsCreating(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleCreateBudget();
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<PlusCircle className='size-5 text-accent' />
					Créer votre budget
				</CardTitle>
			</CardHeader>

			<CardContent className='space-y-4'>
				<div className='text-center space-y-2'>
					<div className='text-2xl'>💰</div>
					<h3 className='font-semibold text-lg'>
						Définissez votre budget mensuel
					</h3>
					<p className='text-neutral-200 text-sm'>
						Suivez vos dépenses et maîtrisez votre budget
						alimentaire
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
							onKeyPress={handleKeyPress}
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
								<PlusCircle className='size-4 mr-2' />
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

// ===== COMPOSANT BUDGET SUMMARY =====
interface BudgetSummaryProps {
	budgetStats: BudgetStats;
}

const BudgetSummary: FC<BudgetSummaryProps> = ({ budgetStats }) => {
	// ===== EXTRACTION DES DONNÉES =====
	const {
		totalBudget,
		totalSpent,
		remaining,
		percentageUsed,
		isOverBudget,
		riskLevel,
		daysRemaining,
		suggestedDailyBudget,
	} = budgetStats;

	// ===== CALCULS DÉRIVÉS =====
	const percentage = Math.min(percentageUsed, 100); // Limiter à 100% pour l'affichage

	// ===== UTILITAIRES LOCAUX =====
	const getBudgetColorClass = (percentage: number): string => {
		if (percentage < 65) return 'text-success-50';
		if (percentage < 80) return 'text-warning-50';
		return 'text-error-100';
	};

	const getBudgetBarClass = (percentage: number): string => {
		if (percentage < 65) return 'bg-success-50';
		if (percentage < 80) return 'bg-warning-50';
		return 'bg-error-100';
	};

	const getBudgetBarBackgroundClass = (percentage: number): string => {
		if (percentage < 65) return 'bg-success-50/10';
		if (percentage < 80) return 'bg-warning-50/10';
		return 'bg-error-100/10';
	};

	const colorClass = getBudgetColorClass(percentage);
	const barClass = getBudgetBarClass(percentage);
	const barBackgroundClass = getBudgetBarBackgroundClass(percentage);

	// ===== MESSAGES D'ÉTAT =====
	const getStatusMessage = (): string => {
		if (isOverBudget) {
			return 'Budget dépassé !';
		}
		if (riskLevel === 'HIGH') {
			return 'Attention au budget';
		}
		if (riskLevel === 'MEDIUM') {
			return 'Budget surveillé';
		}
		return 'Budget maîtrisé';
	};

	const getAdviceMessage = (): string | null => {
		if (daysRemaining > 0 && !isOverBudget) {
			return `${formatPrice(suggestedDailyBudget)}/jour conseillé`;
		}
		if (isOverBudget) {
			return 'Réduisez vos dépenses';
		}
		return null;
	};

	// ===== RENDU =====
	return (
		<Link to='/app/budget'>
			<Card>
				<CardHeader>
					<CardTitle className='flex justify-between items-center'>
						<span className='flex items-center gap-2'>
							<TrendingUp className='size-5 text-accent' />
							Budget du mois
						</span>
						<span
							className={`text-sm font-normal ${
								riskLevel === 'HIGH'
									? 'text-error-100'
									: riskLevel === 'MEDIUM'
									? 'text-warning-50'
									: 'text-success-50'
							}`}>
							{getStatusMessage()}
						</span>
					</CardTitle>
				</CardHeader>

				<CardContent className='space-y-4'>
					{/* ===== MONTANT RESTANT ===== */}
					<div className='flex justify-between items-center'>
						<span className='text-neutral-200'>
							{isOverBudget ? 'Dépassement' : 'Restant'}
						</span>
						<span className={`text-2xl font-bold ${colorClass}`}>
							{formatPrice(Math.abs(remaining))}
						</span>
					</div>

					{/* ===== BARRE DE PROGRESSION ===== */}
					<div className='space-y-2'>
						<div
							className={`w-full rounded-full h-3 ${barBackgroundClass}`}>
							<div
								className={`h-full rounded-full transition-all duration-300 ${barClass}`}
								style={{
									width: `${Math.min(percentage, 100)}%`,
									minWidth: percentage > 0 ? '4px' : '0px', // Largeur minimale visible
								}}
							/>
						</div>

						{/* ===== INDICATEURS DE SEUILS ===== */}
						<div className='flex justify-between text-xs text-neutral-200'>
							<span>0%</span>
							<span className='text-warning-50'>75%</span>
							<span className='text-error-100'>100%</span>
						</div>
					</div>

					{/* ===== CONSEIL BUDGÉTAIRE ===== */}
					{getAdviceMessage() && (
						<div className='text-sm text-neutral-200 bg-neutral-100 rounded-md p-2 text-center'>
							💡 {getAdviceMessage()}
						</div>
					)}
				</CardContent>

				<CardFooter className='flex justify-between text-sm text-neutral-200'>
					<div className='flex flex-col'>
						<span className='font-medium'>
							{formatPrice(totalSpent)} dépensés
						</span>
						<span className='text-xs'>
							sur {formatPrice(totalBudget)}
						</span>
					</div>
					<div className='flex flex-col items-end'>
						<span className='font-medium'>
							{Math.round(percentage)}% utilisé
						</span>
						{daysRemaining > 0 && (
							<span className='text-xs'>
								{daysRemaining} jours restants
							</span>
						)}
					</div>
				</CardFooter>
			</Card>
		</Link>
	);
};

// ===== COMPOSANT BUDGET WIDGET PRINCIPAL =====
export const BudgetWidget: FC = () => {
	const hasBudget = useHasBudget();
	const { budgetStats, isLoading, error, fetchCurrentBudget, clearError } =
		useBudgetStore();

	// ===== EFFECTS =====
	useEffect(() => {
		// Récupérer les données du budget au montage du composant
		fetchCurrentBudget();
	}, [fetchCurrentBudget]);

	// ===== GESTION DES ÉTATS =====

	// État de chargement initial
	if (isLoading) {
		return (
			<Card>
				<CardContent className='flex items-center justify-center py-8'>
					<div className='text-center space-y-2'>
						<Loader2 className='size-8 animate-spin mx-auto text-accent' />
						<p className='text-neutral-200'>
							Chargement du budget...
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// État d'erreur
	if (error) {
		return (
			<Card>
				<CardContent className='py-6'>
					<Alert variant='destructive'>
						<AlertTriangle className='size-4' />
						<AlertDescription className='flex justify-between items-center'>
							<span>{error}</span>
							<Button
								variant='outline'
								size='sm'
								onClick={clearError}>
								Réessayer
							</Button>
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	// ===== RENDU CONDITIONNEL =====

	// Si aucun budget n'existe, afficher l'invite de création
	if (!hasBudget || !budgetStats) {
		return <CreateBudgetPrompt />;
	}

	// Si un budget existe, afficher le résumé
	return <BudgetSummary budgetStats={budgetStats} />;
};
