import React from 'react';
import { cn } from '@/lib/utils';

interface NutriScoreBadgeProps {
	score: 'A' | 'B' | 'C' | 'D' | 'E';
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

const NUTRISCORE_STYLES = {
	A: {
		bg: 'bg-[#2E7D32]', // Vert foncé
		text: 'text-neutral-50',
		border: 'border-[#2E7D32]'
	},
	B: {
		bg: 'bg-[#689F38]', // Vert moyen 
		text: 'text-neutral-50',
		border: 'border-[#689F38]'
	},
	C: {
		bg: 'bg-[#FBC02D]', // Jaune
		text: 'text-black',
		border: 'border-[#FBC02D]'
	},
	D: {
		bg: 'bg-[#F57C00]', // Orange
		text: 'text-black',
		border: 'border-[#F57C00]'
	},
	E: {
		bg: 'bg-[#D32F2F]', // Rouge
		text: 'text-neutral-50',
		border: 'border-[#D32F2F]'
	}
} as const;

// Configuration des tailles
const SIZE_STYLES = {
	sm: {
		container: 'size-5',
		text: 'text-xs'
	},
	md: {
		container: 'size-6', // 1.5rem selon le design system
		text: 'text-sm'
	},
	lg: {
		container: 'size-8',
		text: 'text-base'
	}
} as const;

export const NutriScoreBadge: React.FC<NutriScoreBadgeProps> = ({
	score,
	size = 'md',
	className
}) => {
	const colorStyle = NUTRISCORE_STYLES[score];
	const sizeStyle = SIZE_STYLES[size];

	return (
		<div
			className={cn(
				// Styles de base : cercle avec la lettre centrée
				'rounded-full flex items-center justify-center font-bold border-2',
				// Styles de couleur selon le score
				colorStyle.bg,
				colorStyle.text,
				colorStyle.border,
				// Styles de taille
				sizeStyle.container,
				sizeStyle.text,
				// Classes personnalisées
				className
			)}
			title={`Nutri-Score ${score}`}
			aria-label={`Nutri-Score ${score}`}
		>
			{score}
		</div>
	);
};

export default NutriScoreBadge;