import { FC } from 'react';
import { getNutriscoreColor } from '@/utils/utils';
import { NutriScore } from '@/types';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface NutriscoreWidgetProps {
	averageScore: number;
	variation: number;
}

const NutriscoreWidget: FC<NutriscoreWidgetProps> = ({
	averageScore,
	variation,
}) => {
	// Déterminer la lettre du Nutriscore
	let letterScore: NutriScore;
	switch (true) {
		case averageScore >= 4.5:
			letterScore = 'A';
			break;
		case averageScore >= 3.5:
			letterScore = 'B';
			break;
		case averageScore >= 2.5:
			letterScore = 'C';
			break;
		case averageScore >= 1.5:
			letterScore = 'D';
			break;
		default:
			letterScore = 'E';
	}

	// Déterminer si la variation est positive (bonne) ou négative (mauvaise)
	const isPositiveVariation = variation > 0;
	const variationText = Math.abs(variation).toFixed(1);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Nutriscore global</CardTitle>
			</CardHeader>

			<CardContent>
				<div className='flex items-center space-x-4 mb-4'>
					<div
						className={`font-bold rounded-full size-14 flex items-center justify-center text-6xl ${getNutriscoreColor(
							letterScore
						)}`}>
						{letterScore}
					</div>
				</div>
				<div className='flex items-center gap-2'>
					<span
						className={`text-sm font-medium ${
							isPositiveVariation
								? 'text-success-50'
								: 'text-error-100'
						}`}>
						{isPositiveVariation ? (
							<TrendingUp />
						) : (
							<TrendingDown />
						)}
					</span>
					<p className='text-neutral-300'>
						{isPositiveVariation ? '+' : '-'}
						{variationText}% ce mois
					</p>
				</div>
			</CardContent>
		</Card>
	);
};

export default NutriscoreWidget;
