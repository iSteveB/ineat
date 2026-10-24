import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
	'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[24px_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-5 [&>svg]:translate-y-0.5',
	{
		variants: {
			variant: {
				default: 'bg-surface border-neutral-200 text-neutral-900 [&>svg]:text-neutral-700',
				primary: 'bg-brand-50 border-transparent text-neutral-900 [&>svg]:text-brand-800',
				success: 'bg-success-50 border-transparent text-neutral-900 [&>svg]:text-success-700',
				warning: 'bg-warning-50 border-transparent text-neutral-900 [&>svg]:text-warning-700',
				error: 'bg-danger-50 border-transparent text-neutral-900 [&>svg]:text-danger-700',
				info: 'bg-info-50 border-transparent text-neutral-900 [&>svg]:text-info-700',
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
				'col-start-2 min-h-4 font-medium text-base',
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
				'col-start-2 grid justify-items-start gap-1 text-sm text-neutral-700',
				className
			)}
			{...props}
		/>
	);
}

export { Alert, AlertTitle, AlertDescription };
