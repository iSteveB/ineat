import { FC } from 'react';

// ===== IMPORTS SCHÉMAS ZOD =====
import { BudgetStats } from '@/schemas';

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

// ===== INTERFACE PROPS =====
interface BudgetWidgetProps {
	budgetStats: BudgetStats;
}

// ===== UTILITAIRES LOCAUX =====

/**
 * Détermine la classe de couleur selon le pourcentage utilisé
 */
const getBudgetColorClass = (percentage: number): string => {
	if (percentage < 65) return 'text-success-50';
	if (percentage < 80) return 'text-warning-50';
	return 'text-error-100';
};

/**
 * Détermine la classe de couleur de fond pour la barre de progression
 */
const getBudgetBarClass = (percentage: number): string => {
	if (percentage < 65) return 'bg-success-50';
	if (percentage < 80) return 'bg-warning-50';
	return 'bg-error-100';
};

/**
 * Détermine la classe de couleur de fond (claire) pour la barre de progression
 */
const getBudgetBarBackgroundClass = (percentage: number): string => {
	if (percentage < 65) return 'bg-success-50/10';
	if (percentage < 80) return 'bg-warning-50/10';
	return 'bg-error-100/10';
};

// ===== COMPOSANT BUDGET WIDGET =====
export const BudgetWidget: FC<BudgetWidgetProps> = ({ budgetStats }) => {
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
		<Card>
			<CardHeader>
				<CardTitle className='flex justify-between items-center'>
					<span>Budget du mois</span>
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
	);
};
