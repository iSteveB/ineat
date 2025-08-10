import { FC } from "react";
import { Link } from "@tanstack/react-router";
import { getCurrentMonthTitle } from "@/utils/ui-utils";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { formatCurrency, BudgetStats } from "@/schemas/budget";
import { TrendingDown, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";

interface BudgetSummaryProps {
	budgetStats: BudgetStats;
}

const BudgetSummary: FC<BudgetSummaryProps> = ({ budgetStats }) => {
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

	const percentage = Math.min(percentageUsed, 100);

	const getBudgetColors = (percentage: number, isOverBudget: boolean) => {
		if (isOverBudget) {
			return {
				gradient: 'from-red-500 to-red-600',
				bg: 'bg-red-50',
				border: 'border-red-200',
				text: 'text-red-700',
				icon: 'text-red-600',
				bar: 'from-red-400 to-red-500',
			};
		}
		if (percentage >= 80) {
			return {
				gradient: 'from-orange-500 to-orange-600',
				bg: 'bg-orange-50',
				border: 'border-orange-200',
				text: 'text-orange-700',
				icon: 'text-orange-600',
				bar: 'from-orange-400 to-orange-500',
			};
		}
		if (percentage >= 65) {
			return {
				gradient: 'from-yellow-500 to-yellow-600',
				bg: 'bg-yellow-50',
				border: 'border-yellow-200',
				text: 'text-yellow-700',
				icon: 'text-yellow-600',
				bar: 'from-yellow-400 to-yellow-500',
			};
		}
		return {
			gradient: 'from-emerald-500 to-green-600',
			bg: 'bg-emerald-50',
			border: 'border-emerald-200',
			text: 'text-emerald-700',
			icon: 'text-emerald-600',
			bar: 'from-emerald-400 to-green-500',
		};
	};

	const colors = getBudgetColors(percentage, isOverBudget);

	const getStatusMessage = (): string => {
		if (isOverBudget) return 'Budget dépassé !';
		if (riskLevel === 'HIGH') return 'Attention au budget';
		if (riskLevel === 'MEDIUM') return 'Budget surveillé';
		return 'Budget maîtrisé';
	};

	const getAdviceMessage = (): string | null => {
		if (daysRemaining > 0 && !isOverBudget) {
			return `${formatCurrency(suggestedDailyBudget)}/jour conseillé`;
		}
		if (isOverBudget) {
			return 'Réduisez vos dépenses';
		}
		return null;
	};

	const getStatusIcon = () => {
		if (isOverBudget)
			return <TrendingDown className='size-5 text-red-600' />;
		if (riskLevel === 'HIGH')
			return <AlertTriangle className='size-5 text-orange-600' />;
		return <TrendingUp className='size-5 text-emerald-600' />;
	};

	return (
		<Link to='/app/budget' className='block group'>
			<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]'>
				{/* Effet de brillance en arrière-plan */}
				<div className='absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-2xl -translate-y-8 translate-x-8' />

				<CardHeader className='pb-4'>
					<CardTitle className='flex items-center justify-between text-gray-800'>
						<div className='flex items-center gap-3'>
							<div
								className={`p-2 rounded-xl ${colors.bg} ${colors.border} border`}>
								{getStatusIcon()}
							</div>
							<span className='font-semibold'>
								{getCurrentMonthTitle()}
							</span>
						</div>
						<ArrowRight className='size-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300' />
					</CardTitle>
				</CardHeader>

				<CardContent className='space-y-6'>
					{/* ===== MONTANT PRINCIPAL ===== */}
					<div className='flex items-center justify-between'>
						<div className='space-y-1'>
							<span className='text-sm font-medium text-gray-600'>
								{isOverBudget ? 'Dépassement' : 'Restant'}
							</span>
							<div className='flex items-baseline gap-2'>
								<span
									className={`text-3xl font-bold ${colors.text}`}>
									{formatCurrency(Math.abs(remaining))}
								</span>
							</div>
						</div>
						<div
							className={`px-3 py-1.5 rounded-full text-sm font-semibold ${colors.bg} ${colors.text} ${colors.border} border`}>
							{getStatusMessage()}
						</div>
					</div>

					{/* ===== BARRE DE PROGRESSION ===== */}
					<div className='space-y-3'>
						<div className='flex justify-between items-center text-xs font-medium text-gray-500'>
							<span>Progression du budget</span>
							<span>{Math.round(percentage)}% utilisé</span>
						</div>

						<div className='relative'>
							<div className='w-full bg-gray-200 rounded-full h-3 shadow-inner'>
								<div
									className={`bg-gradient-to-r ${colors.bar} h-3 rounded-full transition-all duration-700 ease-out shadow-sm relative overflow-hidden`}
									style={{
										width: `${Math.min(percentage, 100)}%`,
										minWidth:
											percentage > 0 ? '8px' : '0px',
									}}>
									<div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse' />
								</div>
							</div>

							{/* Marqueurs de seuil */}
							<div className='absolute top-0 left-[65%] w-0.5 h-3 bg-yellow-400 rounded-full' />
							<div className='absolute top-0 left-[80%] w-0.5 h-3 bg-orange-400 rounded-full' />
						</div>

						<div className='flex justify-between text-xs text-gray-500'>
							<span>0%</span>
							<span className='text-yellow-600'>65%</span>
							<span className='text-orange-600'>80%</span>
							<span className='text-red-600'>100%</span>
						</div>
					</div>

					{/* ===== CONSEIL INTELLIGENT ===== */}
					{getAdviceMessage() && (
						<div className='bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4'>
							<div className='flex items-start gap-3'>
								<div className='flex-shrink-0 size-8 bg-blue-100 rounded-lg flex items-center justify-center'>
									<span className='text-lg'>💡</span>
								</div>
								<div className='flex-1'>
									<p className='text-sm font-medium text-gray-800 leading-relaxed'>
										{getAdviceMessage()}
									</p>
								</div>
							</div>
						</div>
					)}
				</CardContent>

				<CardFooter className='flex justify-between pt-4 border-t border-gray-100'>
					<div className='space-y-1'>
						<div className='text-sm font-semibold text-gray-900'>
							{formatCurrency(totalSpent)}
						</div>
						<div className='text-xs text-gray-500'>
							dépensés sur {formatCurrency(totalBudget)}
						</div>
					</div>
					<div className='text-right space-y-1'>
						<div className='text-sm font-semibold text-gray-900'>
							{Math.round(percentage)}% utilisé
						</div>
						{daysRemaining > 0 && (
							<div className='text-xs text-gray-500'>
								{daysRemaining} jours restants
							</div>
						)}
					</div>
				</CardFooter>
			</Card>
		</Link>
	);
};

export default BudgetSummary;