import type { FC, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type StatTone = 'brand' | 'accent' | 'warning' | 'danger';

interface StatCardProps {
	icon: LucideIcon;
	value: ReactNode;
	/** Complète le chiffre comme une phrase : « 5 · à consommer cette semaine ». */
	label: string;
	tone?: StatTone;
	className?: string;
}

const TONES: Record<StatTone, string> = {
	brand: 'bg-brand-50 text-brand-800',
	accent: 'bg-accent-50 text-accent-800',
	warning: 'bg-warning-50 text-warning-700',
	danger: 'bg-danger-50 text-danger-700',
};

const StatCard: FC<StatCardProps> = ({ icon: Icon, value, label, tone = 'brand', className }) => (
	<div className={cn('card flex min-w-0 flex-col gap-1 p-3 sm:p-4', className)}>
		<span className={cn('mb-2 flex size-10 items-center justify-center rounded-md', TONES[tone])}>
			<Icon className='size-5' aria-hidden='true' />
		</span>
		<span className='type-stat text-neutral-900'>{value}</span>
		<span className='text-sm text-neutral-600'>{label}</span>
	</div>
);

export default StatCard;
