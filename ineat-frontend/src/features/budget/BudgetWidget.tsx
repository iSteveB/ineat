import { Budget } from '@/types/types';
import {
	calculateBudgetPercentage,
	formatPrice,
	getBudgetColorClass,
} from '@/utils/utils';
import { FC } from 'react';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from '@/components/ui/card';

interface BudgetWidgetProps {
	budget: Budget;
}

export const BudgetWidget: FC<BudgetWidgetProps> = ({ budget }) => {
	const { amount, spent } = budget;
	const remaining = amount - spent;
	const percentage = calculateBudgetPercentage(spent, amount);
	const colorClass = getBudgetColorClass(percentage);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Budget</CardTitle>
			</CardHeader>

			<CardContent>
				<div className='flex justify-between items-center mb-2'>
					<span className='text-neutral-200'>Restant</span>
					<span className={`text-2xl font-bold ${colorClass}`}>
						{formatPrice(remaining)}
					</span>
				</div>
				<div
					className={`w-full rounded-full h-10 mb-2 ${
						percentage < 65
							? 'bg-success-50/10'
							: percentage < 80
							? 'bg-warning-50/10'
							: 'bg-error-100/10'
					}`}>
					<div
						className={`h-10 rounded-full ${
							percentage < 65
								? 'bg-success-50'
								: percentage < 80
								? 'bg-warning-50'
								: 'bg-error-100'
						}`}
						style={{ width: `${percentage}%` }}></div>
				</div>
			</CardContent>

			<CardFooter className='text-sm'>
				<span>{formatPrice(spent)} dépensés</span>
				<span>{percentage}% utilisé</span>
			</CardFooter>
		</Card>
	);
};
