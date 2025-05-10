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
					'bg-success-50 text-neutral-50 shadow-xs hover:bg-success-50/90 active:bg-success-50/70',
				secondary:
					'bg-neutral-50 border border-neutral-200 text-neutral-300 shadow-xs hover:bg-neutral-100/50 active:bg-neutral-200/50',
				destructive:
					'bg-error-50 text-neutral-50 shadow-xs hover:bg-error-100 active:bg-error-100/80',
				outline:
					'border border-success-50 bg-transparent text-success-50 hover:bg-success-50 hover:text-neutral-50 active:bg-success-50/90',
				ghost: 'bg-transparent text-neutral-300 hover:bg-success-50/10 hover:text-success-50 active:bg-success-50/20',
				link: 'bg-transparent text-success-50 underline-offset-4 hover:underline active:text-success-50/80',
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

function Button({
	className,
	variant,
	size,
	fullWidth,
	asChild = false,
	...props
}: ButtonProps) {
	const Comp = asChild ? Slot : 'button';

	return (
		<Comp
			data-slot='button'
			className={cn(
				buttonVariants({ variant, size, fullWidth, className })
			)}
			{...props}
		/>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
