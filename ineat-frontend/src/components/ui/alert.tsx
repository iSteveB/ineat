import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
	'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[24px_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-5 [&>svg]:translate-y-0.5 [&>svg]:text-current',
	{
		variants: {
			variant: {
				default: 'bg-neutral-50 border-neutral-200 text-neutral-300',
				primary:
					'bg-primary-100/10 border-primary-100 text-neutral-300',
				success: 'bg-success-50/10 border-success-50 text-neutral-300',
				warning: 'bg-warning-50/10 border-warning-50 text-neutral-300',
				error: 'bg-error-50/10 border-error-50 text-neutral-300',
				info: 'bg-info-200/10 border-info-200 text-neutral-300',
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
				'col-start-2 grid justify-items-start gap-1 text-sm text-neutral-200',
				className
			)}
			{...props}
		/>
	);
}

export { Alert, AlertTitle, AlertDescription };
