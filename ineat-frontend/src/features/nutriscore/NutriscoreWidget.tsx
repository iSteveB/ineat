import type { FC } from 'react';
import { TrendingDown, TrendingUp, Target } from 'lucide-react';
import { type NutriScore, numberToNutriScore } from '@/schemas';
import { getNutriscoreBackgroundColor } from '@/utils/ui-utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface NutriscoreWidgetProps {
	averageScore: number;
	variation: number;
}

const NutriscoreWidget: FC<NutriscoreWidgetProps> = ({
	averageScore,
	variation,
}) => {
	// Utiliser la fonction Zod pour convertir le score numérique en lettre
	const letterScore: NutriScore = numberToNutriScore(averageScore);

	// Déterminer si la variation est positive (bonne) ou négative (mauvaise)
	const isPositiveVariation = variation > 0;
	const variationText = Math.abs(variation).toFixed(1);
	const nutriscoreClasses = `
    relative font-bold rounded-2xl size-16 flex items-center justify-center text-2xl
    ${getNutriscoreBackgroundColor(letterScore)} 
    text-neutral-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105
    before:absolute before:inset-0 before:rounded-2xl before:bg-neutral-50/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
  `;

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

	// Obtenir la couleur du gradient pour la barre de progression
	const getProgressGradient = (score: number) => {
		if (score >= 4) return 'from-emerald-400 to-green-500';
		if (score >= 3) return 'from-yellow-400 to-orange-400';
		return 'from-orange-400 to-red-500';
	};

	return (
		<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-xl hover:shadow-2xl transition-all duration-300'>
			{/* Effet de brillance en arrière-plan */}
			<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

			<CardHeader className='pb-4'>
				<CardTitle className='flex items-center justify-between text-gray-800'>
					<div className='flex items-center gap-2'>
						<Target className='size-5 text-blue-600' />
						<span className='font-semibold'>Nutriscore global</span>
					</div>
					<div className='flex items-center gap-1'>
						<span className='text-2xl font-bold text-gray-900'>
							{averageScore.toFixed(1)}
						</span>
						<span className='text-sm font-medium text-gray-500'>
							/5
						</span>
					</div>
				</CardTitle>
			</CardHeader>

			<CardContent className='space-y-6'>
				{/* ===== SCORE PRINCIPAL ===== */}
				<div className='flex items-center gap-6'>
					<div className='relative'>
						<div className={nutriscoreClasses}>
							{letterScore}
							{/* Effet de lueur */}
							<div className='absolute inset-0 rounded-2xl bg-current opacity-20 blur-md' />
						</div>
					</div>

					<div className='flex-1 space-y-2'>
						<p className='text-gray-700 font-medium'>
							{getScoreMessage(letterScore)}
						</p>
						<div className='flex items-center gap-3'>
							<div
								className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
                  ${
						isPositiveVariation
							? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
							: 'bg-red-50 text-red-700 border border-red-200'
					}
                `}>
								{isPositiveVariation ? (
									<TrendingUp className='size-4' />
								) : (
									<TrendingDown className='size-4' />
								)}
								{isPositiveVariation ? '+' : '-'}
								{variationText}%
							</div>
							<span className='text-sm text-gray-500 font-medium'>
								ce mois
							</span>
						</div>
					</div>
				</div>

				{/* ===== BARRE DE PROGRESSION MODERNE ===== */}
				<div className='space-y-3'>
					<div className='flex justify-between items-center text-xs font-medium text-gray-500'>
						<span className='flex items-center gap-1'>
							<div className='size-2 bg-red-400 rounded-full' />E
							(1)
						</span>
						<span className='flex items-center gap-1'>
							A (5)
							<div className='size-2 bg-green-400 rounded-full' />
						</span>
					</div>

					<div className='relative'>
						{/* Barre de fond */}
						<div className='w-full bg-gray-200 rounded-full h-3 shadow-inner'>
							{/* Barre de progression avec gradient animé */}
							<div
								className={`
                  bg-gradient-to-r ${getProgressGradient(
						averageScore
					)} h-3 rounded-full 
                  transition-all duration-700 ease-out shadow-sm
                  relative overflow-hidden
                `}
								style={{
									width: `${(averageScore / 5) * 100}%`,
								}}>
								{/* Effet de brillance animé */}
								<div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse' />
							</div>
						</div>

						{/* Indicateur de position */}
						<div
							className='absolute top-1/2 -translate-y-1/2 size-4 bg-neutral-50 rounded-full shadow-lg border-2 border-gray-300 transition-all duration-700'
							style={{
								left: `calc(${
									(averageScore / 5) * 100
								}% - 8px)`,
							}}
						/>
					</div>
				</div>

				{/* ===== CONSEILS ===== */}
				<div className='relative'>
					<div className='bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4'>
						<div className='flex items-start gap-3'>
							<div className='flex-shrink-0 size-8 bg-blue-100 rounded-lg flex items-center justify-center'>
								{letterScore === 'A' || letterScore === 'B' ? (
									<span className='text-lg'>🎉</span>
								) : letterScore === 'C' ? (
									<span className='text-lg'>💡</span>
								) : (
									<span className='text-lg'>⚠️</span>
								)}
							</div>
							<div className='flex-1'>
								<p className='text-sm font-medium text-gray-800 leading-relaxed'>
									{letterScore === 'A' || letterScore === 'B'
										? 'Continuez ainsi ! Votre alimentation est équilibrée.'
										: letterScore === 'C'
										? "Essayez d'ajouter plus de fruits et légumes frais."
										: 'Privilégiez les produits moins transformés pour améliorer votre score.'}
								</p>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default NutriscoreWidget;
