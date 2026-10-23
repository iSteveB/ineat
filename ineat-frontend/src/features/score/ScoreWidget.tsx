import type { FC } from 'react';
import { Beaker, Leaf, Lightbulb } from 'lucide-react';
import {
	type NutriScore,
	type Ecoscore,
	type Novascore,
	type InventoryItem,
	nutriscoreToNumber,
	numberToNutriScore,
} from '@/schemas';
import {
	ecoscoreToNumber,
	novascoreToNumber,
	numberToNovascore,
	numberToEcoscore,
} from '@/utils/ui-utils';
import NutriScoreScale from '@/components/common/NutriScore';
import ScoreBadge from '@/components/common/ScoreBadge';
import WidgetCard from '@/components/common/WidgetCard';

interface ScoreWidgetProps {
	inventory: InventoryItem[];
}

interface ScoreData {
	counts: { nutri: number; eco: number; nova: number };
	nutriScore: {
		average: number;
		letter: NutriScore;
	};
	ecoScore: {
		average: number;
		letter: Ecoscore;
	};
	novaScore: {
		average: number;
		letter: Novascore;
	};
}

const ScoreWidget: FC<ScoreWidgetProps> = ({ inventory }) => {
	// ===== CALCUL DES SCORES MOYENS =====

	const calculateScores = (): ScoreData => {
		// Filtrer d'abord les items avec un produit valide
		const validItems = inventory.filter((item) => item && item.product);

		// Filtrer les produits qui ont des scores valides
		const productsWithNutriscore = validItems.filter(
			(item) => item.product.nutriscore
		);
		const productsWithEcoscore = validItems.filter(
			(item) => item.product.ecoscore
		);
		const productsWithNovascore = validItems.filter(
			(item) => item.product.novascore
		);

		// Calculer les moyennes
		const avgNutriscore =
			productsWithNutriscore.length > 0
				? productsWithNutriscore.reduce(
						(sum, item) =>
							sum + nutriscoreToNumber(item.product.nutriscore!),
						0
				  ) / productsWithNutriscore.length
				: 0;

		const avgEcoscore =
			productsWithEcoscore.length > 0
				? productsWithEcoscore.reduce(
						(sum, item) =>
							sum + ecoscoreToNumber(item.product.ecoscore!),
						0
				  ) / productsWithEcoscore.length
				: 0;

		const avgNovascore =
			productsWithNovascore.length > 0
				? productsWithNovascore.reduce(
						(sum, item) =>
							sum + novascoreToNumber(item.product.novascore!),
						0
				  ) / productsWithNovascore.length
				: 0;

		return {
			counts: {
				nutri: productsWithNutriscore.length,
				eco: productsWithEcoscore.length,
				nova: productsWithNovascore.length,
			},
			nutriScore: {
				average: avgNutriscore,
				letter: numberToNutriScore(avgNutriscore),
			},
			ecoScore: {
				average: avgEcoscore,
				letter: numberToEcoscore(avgEcoscore),
			},
			novaScore: {
				average: avgNovascore,
				letter: numberToNovascore(avgNovascore),
			},
		};
	};

	const scores = calculateScores();

	// ===== FONCTIONS UTILITAIRES =====

	// Obtenir le message descriptif selon le Nutriscore
	const getNutriscoreMessage = (score: NutriScore): string => {
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

	// Obtenir le message descriptif selon l'Ecoscore
	const getEcoscoreMessage = (score: Ecoscore): string => {
		switch (score) {
			case 'A':
				return 'Impact environnemental très faible';
			case 'B':
				return 'Impact environnemental faible';
			case 'C':
				return 'Impact environnemental modéré';
			case 'D':
				return 'Impact environnemental élevé';
			case 'E':
				return 'Impact environnemental très élevé';
			default:
				return 'Impact environnemental inconnu';
		}
	};

	// Obtenir le message descriptif selon le Novascore
	const getNovascoreMessage = (score: Novascore): string => {
		switch (score) {
			case 'GROUP_1':
				return 'Aliments non transformés';
			case 'GROUP_2':
				return 'Ingrédients culinaires';
			case 'GROUP_3':
				return 'Aliments transformés';
			case 'GROUP_4':
				return 'Aliments ultra-transformés';
			default:
				return 'Niveau de transformation inconnu';
		}
	};

	// Obtenir le conseil selon le score
	const getAdvice = (
		nutriLetter: NutriScore,
		ecoLetter: Ecoscore,
		novaLetter: Novascore
	): string => {
		const nutriGood = nutriLetter === 'A' || nutriLetter === 'B';
		const ecoGood = ecoLetter === 'A' || ecoLetter === 'B';
		const novaGood = novaLetter === 'GROUP_1' || novaLetter === 'GROUP_2';

		if (nutriGood && ecoGood && novaGood) {
			return 'Excellent ! Votre alimentation est équilibrée, responsable et peu transformée.';
		}

		if (!nutriGood && !ecoGood && !novaGood) {
			return 'Essayez de privilégier des produits frais, locaux et peu transformés pour améliorer vos scores.';
		}

		const suggestions: string[] = [];
		if (!nutriGood) suggestions.push('des aliments plus nutritifs');
		if (!ecoGood)
			suggestions.push(
				"des produits plus respectueux de l'environnement"
			);
		if (!novaGood) suggestions.push('des aliments moins transformés');

		return `Vous pourriez améliorer vos scores en choisissant ${suggestions.join(
			' et '
		)}.`;
	};

	const hasScores = scores.counts.nutri + scores.counts.eco + scores.counts.nova > 0;

	if (!hasScores) {
		return (
			<WidgetCard title='Qualité de votre stock'>
				<p className='rounded-md bg-neutral-50 p-4 text-sm text-neutral-700'>
					Scannez des produits pour voir la qualité nutritionnelle de votre stock.
				</p>
			</WidgetCard>
		);
	}

	return (
		<WidgetCard
			title='Qualité de votre stock'
			subtitle='Moyenne des produits notés de votre inventaire.'>
			{scores.counts.nutri > 0 && (
				<div className='flex items-center gap-4'>
					<NutriScoreScale score={scores.nutriScore.letter} />
					<p className='text-sm text-neutral-700'>
						{getNutriscoreMessage(scores.nutriScore.letter)}
						<span className='block text-neutral-600'>
							Sur {scores.counts.nutri} produit{scores.counts.nutri > 1 ? 's' : ''} noté
							{scores.counts.nutri > 1 ? 's' : ''}.
						</span>
					</p>
				</div>
			)}

			<ul className='mt-4 divide-y divide-neutral-200 border-t border-neutral-200'>
				{scores.counts.eco > 0 && (
					<li className='flex items-center gap-3 py-3'>
						<Leaf className='size-5 shrink-0 text-accent-700' aria-hidden='true' />
						<div className='min-w-0 flex-1'>
							<p className='font-medium text-neutral-900'>Environnement</p>
							<p className='text-sm text-neutral-600'>
								{getEcoscoreMessage(scores.ecoScore.letter)}
							</p>
						</div>
						<ScoreBadge type='eco' score={scores.ecoScore.letter} size='md' />
					</li>
				)}
				{scores.counts.nova > 0 && (
					<li className='flex items-center gap-3 py-3'>
						<Beaker className='size-5 shrink-0 text-accent-700' aria-hidden='true' />
						<div className='min-w-0 flex-1'>
							<p className='font-medium text-neutral-900'>Transformation</p>
							<p className='text-sm text-neutral-600'>
								{getNovascoreMessage(scores.novaScore.letter)}
							</p>
						</div>
						<ScoreBadge type='nova' score={scores.novaScore.letter} size='md' />
					</li>
				)}
			</ul>

			<p className='mt-1 flex items-start gap-2 rounded-md bg-accent-50 p-3 text-sm text-accent-800'>
				<Lightbulb className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
				{getAdvice(scores.nutriScore.letter, scores.ecoScore.letter, scores.novaScore.letter)}
			</p>
		</WidgetCard>
	);
};

export default ScoreWidget;
