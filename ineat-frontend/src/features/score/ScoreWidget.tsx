import type { FC } from 'react';
import { Activity, Leaf, Beaker } from 'lucide-react';
import {
	type NutriScore,
	type Ecoscore,
	type Novascore,
	type InventoryItem,
	nutriscoreToNumber,
	numberToNutriScore,
} from '@/schemas';
import {
	getScoreBackgroundColor,
	ecoscoreToNumber,
	novascoreToNumber,
	numberToNovascore,
	numberToEcoscore,
} from '@/utils/ui-utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ScoreWidgetProps {
	inventory: InventoryItem[];
}

interface ScoreData {
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

	// Convertir le Novascore en lettre pour l'affichage
	const novascoreToLetter = (score: Novascore): string => {
		const mapping = {
			GROUP_1: '1',
			GROUP_2: '2',
			GROUP_3: '3',
			GROUP_4: '4',
		};
		return mapping[score];
	};

	// Obtenir les classes CSS pour le badge de score (Nutriscore et Ecoscore)
	const getScoreBadgeClasses = (letter: string): string => {
		return `
			relative font-bold rounded-2xl size-16 flex items-center justify-center text-2xl
			${getScoreBackgroundColor(letter as 'A' | 'B' | 'C' | 'D' | 'E')} 
			text-neutral-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105
			before:absolute before:inset-0 before:rounded-2xl before:bg-neutral-50/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
		`;
	};

	// Obtenir les classes CSS pour le badge Novascore (avec couleurs basées sur le groupe)
	const getNovascoreBadgeClasses = (group: Novascore): string => {
		const colorMap = {
			GROUP_1: 'bg-score-a',
			GROUP_2: 'bg-score-b',
			GROUP_3: 'bg-score-d',
			GROUP_4: 'bg-score-e',
		};
		return `
			relative font-bold rounded-2xl size-16 flex items-center justify-center text-2xl
			${colorMap[group]} 
			text-neutral-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105
			before:absolute before:inset-0 before:rounded-2xl before:bg-neutral-50/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
		`;
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

	return (
		<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-xl hover:shadow-2xl transition-all duration-300'>
			{/* Effet de brillance en arrière-plan */}
			<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

			<CardHeader className='pb-4'>
				<CardTitle className='flex items-center gap-2 text-gray-800'>
					<Activity className='size-5 text-blue-600' />
					<span className='font-semibold'>Scores globaux</span>
				</CardTitle>
			</CardHeader>

			<CardContent className='space-y-6'>
				{/* ===== GRILLE DES TROIS SCORES ===== */}
				<div className='grid grid-cols-3 gap-4'>
					{/* Nutriscore */}
					<div className='flex flex-col items-center gap-2'>
						<div
							className={getScoreBadgeClasses(
								scores.nutriScore.letter
							)}>
							{scores.nutriScore.letter}
							{/* Effet de lueur */}
							<div className='absolute inset-0 rounded-2xl bg-current opacity-20 blur-md' />
						</div>
						<div className='text-center'>
							<p className='text-xs font-semibold text-gray-700'>
								Nutriscore
							</p>
							<p className='text-lg font-bold text-gray-900'>
								{scores.nutriScore.average.toFixed(1)}/5
							</p>
						</div>
					</div>

					{/* Ecoscore */}
					<div className='flex flex-col items-center gap-2'>
						<div
							className={getScoreBadgeClasses(
								scores.ecoScore.letter
							)}>
							{scores.ecoScore.letter}
							{/* Effet de lueur */}
							<div className='absolute inset-0 rounded-2xl bg-current opacity-20 blur-md' />
						</div>
						<div className='text-center'>
							<p className='text-xs font-semibold text-gray-700'>
								Ecoscore
							</p>
							<p className='text-lg font-bold text-gray-900'>
								{scores.ecoScore.average.toFixed(1)}/5
							</p>
						</div>
					</div>

					{/* Novascore */}
					<div className='flex flex-col items-center gap-2'>
						<div
							className={getNovascoreBadgeClasses(
								scores.novaScore.letter
							)}>
							{novascoreToLetter(scores.novaScore.letter)}
							{/* Effet de lueur */}
							<div className='absolute inset-0 rounded-2xl bg-current opacity-20 blur-md' />
						</div>
						<div className='text-center'>
							<p className='text-xs font-semibold text-gray-700'>
								Novascore
							</p>
							<p className='text-lg font-bold text-gray-900'>
								{scores.novaScore.average.toFixed(1)}/4
							</p>
						</div>
					</div>
				</div>

				{/* ===== DESCRIPTIONS DES SCORES ===== */}
				<div className='space-y-3'>
					{/* Nutriscore */}
					<div className='flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-lg border border-blue-100/50'>
						<div className='flex-shrink-0 size-8 bg-blue-100 rounded-lg flex items-center justify-center'>
							<Activity className='size-4 text-blue-600' />
						</div>
						<div className='flex-1 min-w-0'>
							<p className='text-xs font-semibold text-gray-700 mb-0.5'>
								Nutrition
							</p>
							<p className='text-sm text-gray-600 leading-tight'>
								{getNutriscoreMessage(scores.nutriScore.letter)}
							</p>
						</div>
					</div>

					{/* Ecoscore */}
					<div className='flex items-start gap-3 p-3 bg-gradient-to-r from-green-50/50 to-emerald-50/50 rounded-lg border border-green-100/50'>
						<div className='flex-shrink-0 size-8 bg-green-100 rounded-lg flex items-center justify-center'>
							<Leaf className='size-4 text-green-600' />
						</div>
						<div className='flex-1 min-w-0'>
							<p className='text-xs font-semibold text-gray-700 mb-0.5'>
								Environnement
							</p>
							<p className='text-sm text-gray-600 leading-tight'>
								{getEcoscoreMessage(scores.ecoScore.letter)}
							</p>
						</div>
					</div>

					{/* Novascore */}
					<div className='flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-lg border border-purple-100/50'>
						<div className='flex-shrink-0 size-8 bg-purple-100 rounded-lg flex items-center justify-center'>
							<Beaker className='size-4 text-purple-600' />
						</div>
						<div className='flex-1 min-w-0'>
							<p className='text-xs font-semibold text-gray-700 mb-0.5'>
								Transformation
							</p>
							<p className='text-sm text-gray-600 leading-tight'>
								{getNovascoreMessage(scores.novaScore.letter)}
							</p>
						</div>
					</div>
				</div>

				{/* ===== CONSEIL GLOBAL ===== */}
				<div className='bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4'>
					<div className='flex items-start gap-3'>
						<div className='flex-shrink-0 size-8 bg-blue-100 rounded-lg flex items-center justify-center'>
							{scores.nutriScore.letter === 'A' &&
							scores.ecoScore.letter === 'A' &&
							scores.novaScore.letter === 'GROUP_1' ? (
								<span className='text-lg'>🎉</span>
							) : scores.nutriScore.letter === 'C' ||
							  scores.ecoScore.letter === 'C' ||
							  scores.novaScore.letter === 'GROUP_3' ? (
								<span className='text-lg'>💡</span>
							) : (
								<span className='text-lg'>⚠️</span>
							)}
						</div>
						<div className='flex-1'>
							<p className='text-sm font-medium text-gray-800 leading-relaxed'>
								{getAdvice(
									scores.nutriScore.letter,
									scores.ecoScore.letter,
									scores.novaScore.letter
								)}
							</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default ScoreWidget;
