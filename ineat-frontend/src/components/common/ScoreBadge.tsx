import React from 'react';
import { cn } from '@/lib/utils';
import { NutriScore, EcoScore, NovaScore } from '@/schemas';

interface ScoreBadgeProps {
	type: 'nutri' | 'eco' | 'nova';
	score: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

// Configuration unifiée des couleurs pour tous les scores
const SCORE_COLORS = {
	A: {
		bg: 'bg-[#2E7D32]', // Vert foncé
		text: 'text-neutral-50',
		border: 'border-[#2E7D32]',
	},
	B: {
		bg: 'bg-[#689F38]', // Vert moyen
		text: 'text-neutral-50',
		border: 'border-[#689F38]',
	},
	C: {
		bg: 'bg-[#FDBF26]', // Jaune
		text: 'text-neutral-50',
		border: 'border-[#FDBF26]',
	},
	D: {
		bg: 'bg-[#ED661C]', // Orange
		text: 'text-neutral-50',
		border: 'border-[#ED661C]',
	},
	E: {
		bg: 'bg-[#DC0B13]', // Rouge
		text: 'text-neutral-50',
		border: 'border-[#DC0B13]',
	},
	// Mapping pour NovaScore
	GROUP_1: {
		bg: 'bg-[#2E7D32]', // Vert foncé
		text: 'text-neutral-50',
		border: 'border-[#2E7D32]',
	},
	GROUP_2: {
		bg: 'bg-[#689F38]', // Vert moyen
		text: 'text-neutral-50',
		border: 'border-[#689F38]',
	},
	GROUP_3: {
		bg: 'bg-[#ED661C]', // Orange
		text: 'text-neutral-50',
		border: 'border-[#ED661C]',
	},
	GROUP_4: {
		bg: 'bg-[#DC0B13]', // Rouge
		text: 'text-neutral-50',
		border: 'border-[#DC0B13]',
	},
} as const;

// Configuration des types de scores
const SCORE_CONFIG = {
	nutri: {
		label: 'NUTRI',
		getDisplayValue: (score: string) => score, // A, B, C, D, E
		getColorKey: (score: string) => score as keyof typeof SCORE_COLORS,
	},
	eco: {
		label: 'ECO',
		getDisplayValue: (score: string) => score, // A, B, C, D, E
		getColorKey: (score: string) => score as keyof typeof SCORE_COLORS,
	},
	nova: {
		label: 'NOVA',
		getDisplayValue: (score: string) => {
			// Convertit GROUP_1 -> 1, GROUP_2 -> 2, etc.
			const mapping: Record<string, string> = {
				GROUP_1: '1',
				GROUP_2: '2',
				GROUP_3: '3',
				GROUP_4: '4',
			};
			return mapping[score] || score;
		},
		getColorKey: (score: string) => score as keyof typeof SCORE_COLORS,
	},
} as const;

// Configuration des tailles
const SIZE_STYLES = {
	sm: {
		container: 'size-5',
		labelText: 'text-[8px]',
		scoreText: 'text-xs',
		padding: 'p-0.5',
	},
	md: {
		container: 'size-6',
		labelText: 'text-[8px]',
		scoreText: 'text-sm',
		padding: 'p-1',
	},
	lg: {
		container: 'size-8',
		labelText: 'text-[8px]',
		scoreText: 'text-lg',
		padding: 'p-1.5',
	},
} as const;

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
	type,
	score,
	size = 'md',
	className,
}) => {
	const config = SCORE_CONFIG[type];
	const sizeStyle = SIZE_STYLES[size];

	// Gestion des scores manquants ou invalides
	if (!score || score === '' || score === 'undefined' || score === 'null') {
		return (
			<div className='flex flex-col items-center'>
				{/* Label en haut */}
				<span
					className={cn(
						'text-neutral-200 font-medium leading-none',
						sizeStyle.labelText
					)}>
					{config.label}
				</span>
				<div
					className={cn(
						// Styles de base avec fond gris pour score inconnu
						'rounded-lg flex flex-col items-center justify-center font-bold border-2',
						'bg-gray-400 border-gray-400',
						// Styles de taille
						sizeStyle.container,
						sizeStyle.padding,
						// Classes personnalisées
						className
					)}
					title={`${config.label}-Score inconnu`}
					aria-label={`${config.label}-Score inconnu`}>
					{/* Point d'interrogation pour score inconnu */}
					<span
						className={cn(
							'text-neutral-50 font-bold leading-none',
							sizeStyle.scoreText
						)}>
						?
					</span>
				</div>
			</div>
		);
	}

	// Traitement du score valide
	const colorKey = config.getColorKey(score);
	const colorStyle = SCORE_COLORS[colorKey];
	const displayValue = config.getDisplayValue(score);

	// Si le score est présent mais invalide (pas dans SCORE_COLORS)
	if (!colorStyle) {
		return (
			<div className='flex flex-col items-center'>
				{/* Label en haut */}
				<span
					className={cn(
						'text-neutral-200 font-medium leading-none',
						sizeStyle.labelText
					)}>
					{config.label}
				</span>
				<div
					className={cn(
						// Styles de base avec fond gris pour score invalide
						'rounded-lg flex flex-col items-center justify-center font-bold border-2',
						'bg-gray-400 border-gray-400',
						// Styles de taille
						sizeStyle.container,
						sizeStyle.padding,
						// Classes personnalisées
						className
					)}
					title={`${config.label}-Score inconnu`}
					aria-label={`${config.label}-Score inconnu`}>
					{/* Point d'interrogation pour score invalide */}
					<span
						className={cn(
							'text-neutral-50 font-bold leading-none',
							sizeStyle.scoreText
						)}>
						?
					</span>
				</div>
			</div>
		);
	}

	// Score valide - affichage normal
	return (
		<div className='flex flex-col items-center'>
			{/* Label en haut */}
			<span
				className={cn(
					'text-neutral-200 font-medium leading-none',
					sizeStyle.labelText
				)}>
				{config.label}
			</span>
			<div
				className={cn(
					// Styles de base : carré avec coins moins arrondis
					'rounded-lg flex flex-col items-center justify-center font-bold border-2',
					// Styles de couleur selon le score
					colorStyle.bg,
					colorStyle.border,
					// Styles de taille
					sizeStyle.container,
					sizeStyle.padding,
					// Classes personnalisées
					className
				)}
				title={`${config.label}-Score ${displayValue}`}
				aria-label={`${config.label}-Score ${displayValue}`}>
				{/* Valeur principale */}
				<span
					className={cn(
						colorStyle.text,
						'font-bold leading-none',
						sizeStyle.scoreText
					)}>
					{displayValue}
				</span>
			</div>
		</div>
	);
};

// Composants spécialisés pour la compatibilité avec l'API existante
export const NutriScoreBadge: React.FC<{
	score: NutriScore;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}> = ({ score, size, className }) => (
	<ScoreBadge type='nutri' score={score} size={size} className={className} />
);

export const EcoScoreBadge: React.FC<{
	score: EcoScore;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}> = ({ score, size, className }) => (
	<ScoreBadge type='eco' score={score} size={size} className={className} />
);

export const NovaScoreBadge: React.FC<{
	score: NovaScore;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}> = ({ score, size, className }) => (
	<ScoreBadge type='nova' score={score} size={size} className={className} />
);

export default ScoreBadge;
