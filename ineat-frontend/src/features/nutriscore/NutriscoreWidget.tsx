import { FC } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

// ===== IMPORTS SCHÉMAS ZOD =====
import { NutriScore, numberToNutriScore } from '@/schemas';

// ===== IMPORTS UTILITAIRES UI =====
import { getNutriscoreBackgroundColor } from '@/utils/ui-utils';

// ===== IMPORTS COMPOSANTS UI =====
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// ===== INTERFACE PROPS =====
interface NutriscoreWidgetProps {
	averageScore: number;
	variation: number;
}

// ===== COMPOSANT NUTRISCORE WIDGET =====
const NutriscoreWidget: FC<NutriscoreWidgetProps> = ({
	averageScore,
	variation,
}) => {
	// Utiliser la fonction Zod pour convertir le score numérique en lettre
	const letterScore: NutriScore = numberToNutriScore(averageScore);

	// Déterminer si la variation est positive (bonne) ou négative (mauvaise)
	const isPositiveVariation = variation > 0;
	const variationText = Math.abs(variation).toFixed(1);

	// Classes CSS pour le badge Nutriscore
	const nutriscoreClasses = `font-bold rounded-full size-14 flex items-center justify-center text-2xl ${getNutriscoreBackgroundColor(
		letterScore
	)} ${letterScore === 'C' ? 'text-neutral-300' : 'text-neutral-50'}`;

	// Obtenir un message descriptif selon le score
	const getScoreMessage = (score: NutriScore): string => {
		switch (score) {
			case 'A':
				return 'Excellente qualité nutritionnelle';
			case 'B':
				return 'Bonne qualité nutritionnelle';
			case 'C':
				return 'Qualité nutritionnelle correcte';
			case 'D':
				return 'Qualité nutritionnelle faible';
			case 'E':
				return 'Qualité nutritionnelle très faible';
			default:
				return 'Qualité nutritionnelle inconnue';
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center justify-between'>
					<span>Nutriscore global</span>
					<span className='text-sm font-normal text-neutral-200'>
						{averageScore.toFixed(1)}/5
					</span>
				</CardTitle>
			</CardHeader>

			<CardContent className='space-y-4'>
				{/* ===== SCORE PRINCIPAL ===== */}
				<div className='flex items-center gap-4'>
					<div className={nutriscoreClasses}>{letterScore}</div>
					<div className='flex-1'>
						<p className='text-sm text-neutral-200 mb-1'>
							{getScoreMessage(letterScore)}
						</p>
						<div className='flex items-center gap-2'>
							<span
								className={`flex items-center gap-1 text-sm font-medium ${
									isPositiveVariation
										? 'text-success-50'
										: 'text-error-100'
								}`}>
								{isPositiveVariation ? (
									<TrendingUp className='size-4' />
								) : (
									<TrendingDown className='size-4' />
								)}
								{isPositiveVariation ? '+' : '-'}
								{variationText}%
							</span>
							<span className='text-sm text-neutral-200'>
								ce mois
							</span>
						</div>
					</div>
				</div>

				{/* ===== BARRE DE PROGRESSION ===== */}
				<div className='space-y-2'>
					<div className='flex justify-between text-xs text-neutral-200'>
						<span>E (1)</span>
						<span>A (5)</span>
					</div>
					<div className='w-full bg-neutral-100 rounded-full h-2'>
						<div
							className='bg-gradient-to-r from-error-100 via-warning-50 to-success-50 h-2 rounded-full transition-all duration-300'
							style={{ width: `${(averageScore / 5) * 100}%` }}
						/>
					</div>
				</div>

				{/* ===== CONSEILS ===== */}
				<div className='text-xs text-neutral-200 bg-neutral-100 rounded-md p-2'>
					{letterScore === 'A' || letterScore === 'B' ? (
						<span>
							🎉 Continuez ainsi ! Votre alimentation est
							équilibrée.
						</span>
					) : letterScore === 'C' ? (
						<span>
							💡 Essayez d'ajouter plus de fruits et légumes
							frais.
						</span>
					) : (
						<span>
							⚠️ Privilégiez les produits moins transformés pour
							améliorer votre score.
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

export default NutriscoreWidget;
