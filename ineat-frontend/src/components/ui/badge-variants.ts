import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
	'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-neutral-100 text-neutral-800',
				secondary: 'border-transparent bg-accent-50 text-accent-800',
				error: 'border-transparent bg-danger-600 text-surface',
				outline: 'border-neutral-300 text-neutral-700',
				premium: 'border-transparent bg-brand-300 text-neutral-900',
				success: 'border-transparent bg-success-50 text-success-700',
				warning: 'border-transparent bg-warning-50 text-warning-700',
				nutriscore_a: 'border-transparent bg-nutri-a text-surface font-bold',
				nutriscore_b: 'border-transparent bg-nutri-b text-neutral-900 font-bold',
				nutriscore_c: 'border-transparent bg-nutri-c text-neutral-900 font-bold',
				nutriscore_d: 'border-transparent bg-nutri-d text-neutral-900 font-bold',
				nutriscore_e: 'border-transparent bg-nutri-e text-surface font-bold',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
);
