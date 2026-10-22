import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring hover:cursor-pointer",
	{
		variants: {
			variant: {
				primary:
					'bg-accent-600 text-surface shadow-xs hover:bg-accent-700 active:bg-accent-800',
				secondary:
					'bg-surface border border-neutral-300 text-neutral-900 shadow-xs hover:bg-neutral-50 active:bg-neutral-100',
				error: 'bg-danger-600 text-surface shadow-xs hover:bg-danger-700 active:bg-danger-700',
				outline:
					'border border-accent-600 bg-transparent text-accent-700 hover:bg-accent-50 active:bg-accent-100',
				ghost: 'bg-transparent text-neutral-900 hover:bg-neutral-50 hover:text-accent-700 active:bg-neutral-100',
				link: 'bg-transparent text-accent-700 underline-offset-4 hover:underline active:text-accent-800',
				brand:
					'bg-brand-300 text-neutral-900 shadow-xs hover:bg-brand-500 active:bg-brand-500',
			},
			size: {
				sm: 'h-9 px-3 text-sm',
				default: 'h-11 px-5 text-base',
				lg: 'h-13 px-6 text-[1.0625rem]',
				icon: 'size-11 p-0',
				'icon-sm': 'size-9 p-0',
				'icon-lg': 'size-13 p-0',
				rounded: 'rounded-full',
			},
			fullWidth: {
				true: 'w-full',
			},
		},
		defaultVariants: {
			variant: 'primary',
			size: 'default',
			fullWidth: false,
		},
	}
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{ className, variant, size, fullWidth, asChild = false, ...props },
		ref
	) => {
		const Comp = asChild ? Slot : 'button';

		return (
			<Comp
				ref={ref}
				data-slot='button'
				className={cn(
					buttonVariants({ variant, size, fullWidth, className })
				)}
				{...props}
			/>
		);
	}
);
Button.displayName = 'Button';

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
