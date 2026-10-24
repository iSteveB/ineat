import { ChevronRight, Lock } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import React from 'react';

import { cn } from '@/lib/utils';

interface AddMethodCardProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	to: string;
	isPremium?: boolean;
	isDisabled?: boolean;
	/** Met la méthode en avant (fond accent-50). */
	isRecommended?: boolean;
	onClick?: () => void;
}

/** Carte de choix d'une méthode d'ajout : un lien unique, accessible au clavier. */
const AddMethodCard: React.FC<AddMethodCardProps> = ({
	icon,
	title,
	description,
	to,
	isPremium = false,
	isDisabled = false,
	isRecommended = false,
	onClick,
}) => {
	const content = (
		<>
			<span
				className={cn(
					'flex size-12 shrink-0 items-center justify-center rounded-md',
					isRecommended ? 'bg-accent-600 text-surface' : 'bg-accent-50 text-accent-800'
				)}>
				{icon}
			</span>
			<span className='min-w-0 flex-1'>
				<span className='flex flex-wrap items-center gap-2'>
					<span className='type-h3 text-neutral-900'>{title}</span>
					{isRecommended && (
						<span className='rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-accent-800'>
							Recommandé
						</span>
					)}
					{isPremium && (
						<span className='inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800'>
							<Lock className='size-3' aria-hidden='true' />
							Premium
						</span>
					)}
				</span>
				<span className='mt-1 block text-sm text-neutral-700'>{description}</span>
			</span>
			{!isDisabled && (
				<ChevronRight
					className='size-5 shrink-0 text-neutral-500 group-hover:text-accent-700'
					aria-hidden='true'
				/>
			)}
		</>
	);

	const className = cn(
		'card group flex items-center gap-4 p-4 sm:p-5 transition-[box-shadow,border-color]',
		isRecommended && 'border-accent-600 bg-accent-50',
		isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:shadow-md'
	);

	if (isDisabled || !to) {
		return (
			<div className={className} aria-disabled={isDisabled || undefined}>
				{content}
			</div>
		);
	}

	return (
		<Link to={to} className={className} onClick={onClick}>
			{content}
		</Link>
	);
};

export default AddMethodCard;
