import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
	'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
	{
		variants: {
			variant: {
				default:
					'border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80',
				secondary:
					'border-transparent bg-neutral-50 text-neutral-600 hover:bg-neutral-50/80',
				error: 'border-transparent bg-danger-600 text-surface hover:bg-danger-600/80',
				outline: 'text-neutral-900',
				premium:
					'border-transparent bg-orange-500 text-surface hover:bg-orange-600',
				success:
					'border-transparent bg-accent-600 text-surface hover:bg-accent-600/80',
				warning:
					'border-transparent bg-warning-50 text-neutral-900 hover:bg-warning-50/80',
				nutriscore_a:
					'border-transparent bg-[#2E7D32] text-surface font-bold',
				nutriscore_b:
					'border-transparent bg-[#689F38] text-surface font-bold',
				nutriscore_c:
					'border-transparent bg-[#FBC02D] text-neutral-900 font-bold',
				nutriscore_d:
					'border-transparent bg-[#F57C00] text-neutral-900 font-bold',
				nutriscore_e:
					'border-transparent bg-[#D32F2F] text-surface font-bold',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
);
