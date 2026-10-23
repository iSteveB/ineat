import { useId, type FC, type ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface WidgetCardProps {
	title: string;
	/** Phrase courte sous le titre (état, conseil). */
	subtitle?: ReactNode;
	action?: { label: string; to: LinkProps['to'] };
	children: ReactNode;
	className?: string;
	'data-testid'?: string;
}

/** Carte de widget du tableau de bord : titre h2, lien optionnel, contenu. */
const WidgetCard: FC<WidgetCardProps> = ({
	title,
	subtitle,
	action,
	children,
	className,
	'data-testid': testId,
}) => {
	const titleId = useId();

	return (
		<section
			aria-labelledby={titleId}
			data-testid={testId}
			className={cn('card min-w-0 p-4 sm:p-5', className)}>
			<div className='mb-3 flex items-start justify-between gap-3'>
				<div className='min-w-0'>
					<h2 id={titleId} className='type-h2 text-neutral-900'>
						{title}
					</h2>
					{subtitle && <p className='mt-0.5 text-sm text-neutral-600'>{subtitle}</p>}
				</div>
				{action && (
					<Link
						to={action.to}
						className='inline-flex shrink-0 items-center gap-0.5 rounded-sm pt-1 text-sm font-medium text-accent-700 hover:underline'>
						{action.label}
						<ChevronRight className='size-4' aria-hidden='true' />
					</Link>
				)}
			</div>
			{children}
		</section>
	);
};

export default WidgetCard;
