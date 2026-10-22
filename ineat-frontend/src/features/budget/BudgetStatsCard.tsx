import { Card, CardContent } from "@/components/ui/card";
import { Budget, BudgetStats } from "@/schemas";
import { budgetService } from "@/services/budgetService";
import { Euro, TrendingDown, TrendingUp, PieChart } from "lucide-react";
import { FC, useMemo } from "react";

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
						<Euro className='size-4 text-accent-700' />
						<span className='text-sm text-neutral-600'>
							Budget total
						</span>
					</div>
					<p className='text-2xl font-bold'>{safeBudgetAmount}</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className='p-4'>
					<div className='flex items-center gap-2 mb-1'>
						<TrendingDown className='size-4 text-danger-700' />
						<span className='text-sm text-neutral-600'>
							Dépensé
						</span>
					</div>
					<p className='text-2xl font-bold text-danger-700'>
						{safeTotalSpent}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className='p-4'>
					<div className='flex items-center gap-2 mb-1'>
						<TrendingUp className='size-4 text-accent-700' />
						<span className='text-sm text-neutral-600'>
							Restant
						</span>
					</div>
					<p className='text-2xl font-bold text-accent-700'>
						{safeRemaining}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className='p-4'>
					<div className='flex items-center gap-2 mb-1'>
						<PieChart className='size-4 text-warning-700' />
						<span className='text-sm text-neutral-600'>
							Utilisé
						</span>
					</div>
					<p className='text-2xl font-bold text-warning-700'>
						{Math.round(stats.percentageUsed)}%
					</p>
				</CardContent>
			</Card>
		</div>
	);
};

export default BudgetStatsCards;
