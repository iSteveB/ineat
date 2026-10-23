import type { FC } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { ArrowRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type PriorityTone = 'warning' | 'accent' | 'info' | 'danger';

interface PriorityActionProps {
	tone: PriorityTone;
	icon: LucideIcon;
	title: string;
	description: string;
	actionLabel: string;
	to: LinkProps['to'];
	titleId?: string;
	className?: string;
}

const TONES: Record<PriorityTone, { container: string; icon: string; link: string }> = {
	warning: {
		container: 'bg-warning-50',
		icon: 'text-warning-700',
		link: 'text-warning-700',
	},
	accent: {
		container: 'bg-accent-50',
		icon: 'text-accent-800',
		link: 'text-accent-800',
	},
	info: {
		container: 'bg-info-50',
		icon: 'text-info-700',
		link: 'text-info-700',
	},
	danger: {
		container: 'bg-danger-50',
		icon: 'text-danger-700',
		link: 'text-danger-700',
	},
};

/** Encart d'action prioritaire : une seule par écran, en tête du tableau de bord. */
const PriorityAction: FC<PriorityActionProps> = ({
	tone,
	icon: Icon,
	title,
	description,
	actionLabel,
	to,
	titleId,
	className,
}) => {
	const styles = TONES[tone];

	return (
		<section
			aria-labelledby={titleId}
			className={cn('flex items-start gap-3 rounded-lg p-4 sm:p-5', styles.container, className)}>
			<span
				className={cn(
					'flex size-10 shrink-0 items-center justify-center rounded-md bg-surface',
					styles.icon
				)}>
				<Icon className='size-5' aria-hidden='true' />
			</span>
			<div className='min-w-0'>
				<h2 id={titleId} className='type-h3 text-neutral-900'>
					{title}
				</h2>
				<p className='mt-0.5 text-sm text-neutral-700'>{description}</p>
				<Link
					to={to}
					className={cn(
						'mt-2 inline-flex items-center gap-1 rounded-sm text-sm font-medium underline underline-offset-4',
						styles.link
					)}>
					{actionLabel}
					<ArrowRight className='size-4' aria-hidden='true' />
				</Link>
			</div>
		</section>
	);
};

export default PriorityAction;
