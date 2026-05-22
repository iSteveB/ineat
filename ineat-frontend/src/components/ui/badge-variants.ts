import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
	'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
	{
		variants: {
			variant: {
				default:
					'border-transparent bg-neutral-200 text-neutral-300 hover:bg-neutral-200/80',
				secondary:
					'border-transparent bg-neutral-100 text-neutral-200 hover:bg-neutral-100/80',
				error: 'border-transparent bg-error-500 text-neutral-50 hover:bg-error-500/80',
				outline: 'text-neutral-300',
				premium:
					'border-transparent bg-orange-500 text-neutral-50 hover:bg-orange-600',
				success:
					'border-transparent bg-success-50 text-neutral-50 hover:bg-success-50/80',
				warning:
					'border-transparent bg-warning-50 text-neutral-300 hover:bg-warning-50/80',
				nutriscore_a:
					'border-transparent bg-[#2E7D32] text-neutral-50 font-bold',
				nutriscore_b:
					'border-transparent bg-[#689F38] text-neutral-50 font-bold',
				nutriscore_c:
					'border-transparent bg-[#FBC02D] text-neutral-300 font-bold',
				nutriscore_d:
					'border-transparent bg-[#F57C00] text-neutral-300 font-bold',
				nutriscore_e:
					'border-transparent bg-[#D32F2F] text-neutral-50 font-bold',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
);
