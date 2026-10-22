import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:cursor-pointer",
	{
		variants: {
			variant: {
				primary:
					'bg-accent-600 text-surface shadow-xs hover:bg-accent-600/90 active:bg-accent-600/70',
				secondary:
					'bg-surface border border-neutral-200 text-neutral-900 shadow-xs hover:bg-neutral-50/50 active:bg-neutral-100/50',
				error: 'bg-danger-50 text-surface shadow-xs hover:bg-danger-600 active:bg-danger-600/80',
				outline:
					'border border-accent-600 bg-transparent text-accent-700 hover:bg-accent-600 hover:text-surface active:bg-accent-600/90',
				ghost: 'bg-transparent text-neutral-900 hover:bg-accent-600/10 hover:text-accent-700 active:bg-accent-600/20',
				link: 'bg-transparent text-accent-700 underline-offset-4 hover:underline active:text-accent-700/80',
			},
			size: {
				sm: 'h-8 px-3 py-1.5 text-xs',
				default: 'h-10 px-4 py-2',
				lg: 'h-12 px-6 py-2.5 text-base',
				icon: 'size-10 p-0',
				'icon-sm': 'size-8 p-0',
				'icon-lg': 'size-12 p-0',
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
