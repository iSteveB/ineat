import type { FC, ReactNode } from 'react';
import { CircleAlert, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

interface BudgetProgressProps {
	/** Titre affiché à gauche du montant (ex. un <h2>). */
	title?: ReactNode;
	spent: number;
	total: number;
	daysRemaining?: number;
	className?: string;
}

/** Montant en euros, sans centimes quand ils sont nuls : « 212 € », « 13,80 € ». */
const formatCurrency = (amount: number) =>
	new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
	}).format(amount);

/** Seuil à partir duquel la barre passe en avertissement (en %). */
const WARNING_THRESHOLD = 80;

/** Barre de budget du mois : accent jusqu'à 80 %, avertissement ensuite, danger au-delà du budget. */
const BudgetProgress: FC<BudgetProgressProps> = ({ title, spent, total, daysRemaining, className }) => {
	const percentage = total > 0 ? Math.round((spent / total) * 100) : 0;
	const isOver = spent > total;
	const isWarning = !isOver && percentage >= WARNING_THRESHOLD;
	const remaining = total - spent;

	const note = isOver
		? `Budget dépassé de ${formatCurrency(-remaining)}.`
		: isWarning
			? `${percentage} % utilisé, il reste ${formatCurrency(remaining)}.`
			: daysRemaining && daysRemaining > 0
				? `Il reste ${formatCurrency(remaining)} pour ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}.`
				: `Il reste ${formatCurrency(remaining)}.`;

	return (
		<div className={cn('flex flex-col gap-2', className)}>
			<div className='flex flex-wrap items-baseline justify-between gap-x-3'>
				{title}
				<p className='ml-auto flex items-baseline gap-1'>
					<span className='font-display text-[1.375rem] font-bold leading-7 text-neutral-900'>
						{formatCurrency(spent)}
					</span>
					<span className='text-sm text-neutral-600'>/ {formatCurrency(total)}</span>
				</p>
			</div>
			<div
				role='progressbar'
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.min(percentage, 100)}
				aria-label={isOver ? note : `${percentage} % du budget utilisé`}
				className='h-2.5 overflow-hidden rounded-full bg-neutral-100'>
				<div
					className={cn(
						'h-full rounded-full transition-[width] duration-500',
						isOver ? 'bg-danger-600' : isWarning ? 'bg-warning-700' : 'bg-accent-600'
					)}
					style={{ width: `${Math.min(percentage, 100)}%` }}
				/>
			</div>
			<p
				className={cn(
					'flex items-center gap-1.5 text-sm',
					isOver ? 'text-danger-700' : isWarning ? 'text-warning-700' : 'text-neutral-600'
				)}>
				{isOver && <CircleAlert className='size-4 shrink-0' aria-hidden='true' />}
				{isWarning && <TriangleAlert className='size-4 shrink-0' aria-hidden='true' />}
				{note}
			</p>
		</div>
	);
};

export default BudgetProgress;
