import type { FC, ReactNode } from 'react';
import {
	CalendarX,
	CircleHelp,
	Clock,
	Leaf,
	TriangleAlert,
	type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ExpiryStatus } from '@/schemas';

interface ExpiryBadgeProps {
	status: ExpiryStatus;
	/** Libellé relatif lisible seul : « Demain », « Dans 3 jours », « Périmé »… */
	children: ReactNode;
	className?: string;
}

// La couleur ne porte jamais seule l'information : chaque état a aussi une icône et un libellé.
const STATUS_STYLES: Record<ExpiryStatus, { icon: LucideIcon; className: string }> = {
	GOOD: { icon: Leaf, className: 'bg-success-50 text-success-700' },
	WARNING: { icon: Clock, className: 'bg-warning-50 text-warning-700' },
	CRITICAL: { icon: TriangleAlert, className: 'bg-danger-50 text-danger-700' },
	EXPIRED: { icon: CalendarX, className: 'bg-danger-600 text-surface' },
	UNKNOWN: { icon: CircleHelp, className: 'bg-neutral-100 text-neutral-700' },
};

const ExpiryBadge: FC<ExpiryBadgeProps> = ({ status, children, className }) => {
	const { icon: Icon, className: tone } = STATUS_STYLES[status];

	return (
		<span
			className={cn(
				'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-sm font-medium',
				tone,
				className
			)}>
			<Icon className='size-4' aria-hidden='true' />
			{children}
		</span>
	);
};

export default ExpiryBadge;
