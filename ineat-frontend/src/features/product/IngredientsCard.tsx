import React from 'react';
import { TriangleAlert } from 'lucide-react';

import WidgetCard from '@/components/common/WidgetCard';

interface IngredientsCardProps {
	ingredients?: string | null;
	className?: string;
	compact?: boolean;
}

// Mots-clés d'allergènes courants : simple aide à la lecture, l'étiquette officielle fait foi
const ALLERGEN_KEYWORDS = [
	'gluten', 'blé', 'seigle', 'orge', 'avoine',
	'lait', 'lactose', 'crème', 'beurre', 'fromage',
	'œuf', 'oeuf',
	'soja', 'soya',
	'arachide', 'cacahuète',
	'noix', 'amande', 'noisette', 'pistache',
	'poisson', 'thon', 'saumon',
	'crustacé', 'crevette', 'crabe',
	'mollusque', 'moule', 'huître',
	'céleri', 'moutarde', 'sésame', 'sulfite',
];

export const IngredientsCard: React.FC<IngredientsCardProps> = ({
	ingredients,
	className,
	compact = false,
}) => {
	if (!ingredients || ingredients.trim() === '') {
		return (
			<WidgetCard title='Ingrédients' className={className}>
				<p className='text-sm text-neutral-600'>
					La liste des ingrédients n'est pas disponible pour ce produit.
				</p>
			</WidgetCard>
		);
	}

	const normalizedIngredients = ingredients.toLowerCase();
	const detectedAllergens = ALLERGEN_KEYWORDS.filter((allergen) =>
		normalizedIngredients.includes(allergen)
	);

	return (
		<WidgetCard
			title='Ingrédients'
			subtitle={compact ? undefined : 'Par ordre décroissant de poids dans le produit.'}
			className={className}>
			<p className='leading-relaxed text-neutral-700'>{ingredients}</p>

			{detectedAllergens.length > 0 && (
				<div className='mt-4 flex items-start gap-2 rounded-md bg-warning-50 p-3 text-sm text-warning-700'>
					<TriangleAlert className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
					<p>
						<span className='font-medium'>Allergènes possibles : </span>
						{detectedAllergens.join(', ')}.{' '}
						<span className='text-neutral-700'>Vérifiez toujours l'étiquette du produit.</span>
					</p>
				</div>
			)}
		</WidgetCard>
	);
};

export default IngredientsCard;
