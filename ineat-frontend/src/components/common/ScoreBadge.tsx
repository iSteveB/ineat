import React from 'react';
import { cn } from '@/lib/utils';
import { NutriScore, Ecoscore, Novascore } from '@/schemas';

interface ScoreBadgeProps {
	type: 'nutri' | 'eco' | 'nova';
	score: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

// Couleurs officielles du Nutri-Score (tokens nutri-*). Lettre foncée sur les fonds clairs pour rester lisible.
const SCORE_COLORS = {
	A: { bg: 'bg-nutri-a', text: 'text-surface', border: 'border-nutri-a' },
	B: { bg: 'bg-nutri-b', text: 'text-neutral-900', border: 'border-nutri-b' },
	C: { bg: 'bg-nutri-c', text: 'text-neutral-900', border: 'border-nutri-c' },
	D: { bg: 'bg-nutri-d', text: 'text-neutral-900', border: 'border-nutri-d' },
	E: { bg: 'bg-nutri-e', text: 'text-surface', border: 'border-nutri-e' },
	// Mapping pour Novascore
	GROUP_1: { bg: 'bg-nutri-a', text: 'text-surface', border: 'border-nutri-a' },
	GROUP_2: { bg: 'bg-nutri-b', text: 'text-neutral-900', border: 'border-nutri-b' },
	GROUP_3: { bg: 'bg-nutri-d', text: 'text-neutral-900', border: 'border-nutri-d' },
	GROUP_4: { bg: 'bg-nutri-e', text: 'text-surface', border: 'border-nutri-e' },
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
						'text-neutral-600 font-medium leading-none',
						sizeStyle.labelText
					)}>
					{config.label}
				</span>
				<div
					className={cn(
						// Styles de base avec fond gris pour score inconnu
						'rounded-lg flex flex-col items-center justify-center font-bold border-2',
						'bg-neutral-100 border-neutral-300',
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
							'text-neutral-700 font-bold leading-none',
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
						'text-neutral-600 font-medium leading-none',
						sizeStyle.labelText
					)}>
					{config.label}
				</span>
				<div
					className={cn(
						// Styles de base avec fond gris pour score invalide
						'rounded-lg flex flex-col items-center justify-center font-bold border-2',
						'bg-neutral-100 border-neutral-300',
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
							'text-neutral-700 font-bold leading-none',
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
					'text-neutral-600 font-medium leading-none',
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

export const EcoscoreBadge: React.FC<{
	score: Ecoscore;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}> = ({ score, size, className }) => (
	<ScoreBadge type='eco' score={score} size={size} className={className} />
);

export const NovascoreBadge: React.FC<{
	score: Novascore;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}> = ({ score, size, className }) => (
	<ScoreBadge type='nova' score={score} size={size} className={className} />
);

export default ScoreBadge;
