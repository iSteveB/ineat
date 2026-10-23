import { Link } from '@tanstack/react-router';
import { FC } from 'react';

import { cn } from '@/lib/utils';

interface NavigationItemProps {
	icon: React.ReactNode;
	to: string;
	label: string;
	isActive: boolean;
}

/** Élément de la navigation basse : icône dans une pilule, libellé dessous. */
const NavigationItem: FC<NavigationItemProps> = ({ icon, to, label, isActive }) => (
	<Link
		to={to}
		aria-current={isActive ? 'page' : undefined}
		className={cn(
			'flex min-w-16 flex-col items-center gap-0.5 rounded-md py-1 text-xs leading-4 transition-colors',
			isActive ? 'font-semibold text-accent-700' : 'font-medium text-neutral-600 hover:text-accent-700'
		)}
		data-testid={`nav-${label.toLowerCase()}`}>
		<span
			className={cn(
				'flex h-7.5 w-13 items-center justify-center rounded-full transition-colors',
				isActive && 'bg-accent-50'
			)}>
			{icon}
		</span>
		{label}
	</Link>
);

export default NavigationItem;
