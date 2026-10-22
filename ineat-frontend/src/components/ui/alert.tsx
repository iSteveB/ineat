import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
	'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[24px_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-5 [&>svg]:translate-y-0.5 [&>svg]:text-current',
	{
		variants: {
			variant: {
				default: 'bg-surface border-neutral-200 text-neutral-900',
				primary:
					'bg-brand-300/10 border-brand-300 text-neutral-900',
				success: 'bg-accent-600/10 border-accent-600 text-neutral-900',
				warning: 'bg-warning-50/10 border-warning-500 text-neutral-900',
				error: 'bg-danger-50/10 border-danger-600 text-neutral-900',
				info: 'bg-info-50/10 border-info-700 text-neutral-900',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
);

interface AlertProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof alertVariants> {
	icon?: React.ReactNode;
}

function Alert({ className, variant, icon, children, ...props }: AlertProps) {
	return (
		<div
			data-slot='alert'
			role='alert'
			className={cn(alertVariants({ variant }), className)}
			{...props}>
			{icon}
			{children}
		</div>
	);
}

function AlertTitle({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot='alert-title'
			className={cn(
				'col-start-2 line-clamp-1 min-h-4 font-medium text-base tracking-tight',
				className
			)}
			{...props}
		/>
	);
}

function AlertDescription({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot='alert-description'
			className={cn(
				'col-start-2 grid justify-items-start gap-1 text-sm text-neutral-600',
				className
			)}
			{...props}
		/>
	);
}

export { Alert, AlertTitle, AlertDescription };
