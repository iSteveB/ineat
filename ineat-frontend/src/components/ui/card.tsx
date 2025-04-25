import * as React from 'react';

import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card'
			className={cn(
				'bg-neutral-50 rounded-lg shadow-md p-6 flex flex-col',
				className
			)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-header'
			className={cn('mb-4', className)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
	return (
		<h2
			data-slot='card-title'
			className={cn('text-2xl font-bold text-neutral-300', className)}
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-description'
			className={cn('text-neutral-200 text-sm', className)}
			{...props}
		/>
	);
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-action'
			className={cn('flex justify-end', className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-content'
			className={cn('', className)}
			{...props}
		/>
	);
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-footer'
			className={cn('mt-4 flex items-center justify-between', className)}
			{...props}
		/>
	);
}

function CardStatValue({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-stat-value'
			className={cn('text-5xl font-bold text-neutral-300', className)}
			{...props}
		/>
	);
}

function CardStatLabel({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-stat-label'
			className={cn('text-neutral-200', className)}
			{...props}
		/>
	);
}

function CardItemList({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-item-list'
			className={cn('space-y-4', className)}
			{...props}
		/>
	);
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
	CardStatValue,
	CardStatLabel,
	CardItemList,
};
