import React from 'react';
import { TriangleAlert } from 'lucide-react';

import WidgetCard from '@/components/common/WidgetCard';
import { detectAllergens } from '@/utils/allergens';

interface IngredientsCardProps {
	ingredients?: string | null;
	className?: string;
	compact?: boolean;
}

const renderHighlightedAllergens = (ingredients: string): React.ReactNode[] =>
	ingredients.split(/(_[^_]+_)/g).filter(Boolean).map((part, index) => {
		if (part.startsWith('_') && part.endsWith('_')) {
			return (
				<strong key={`${part}-${index}`} className='font-semibold text-neutral-900'>
					{part.slice(1, -1)}
				</strong>
			);
		}

		return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
	});

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

	const detectedAllergens = detectAllergens(ingredients);

	return (
		<WidgetCard
			title='Ingrédients'
			subtitle={compact ? undefined : 'Par ordre décroissant de poids dans le produit.'}
			className={className}>
			<p className='leading-relaxed text-neutral-700'>
				{renderHighlightedAllergens(ingredients)}
			</p>

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
