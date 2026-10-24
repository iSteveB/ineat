import type { FC } from 'react';
import { Link } from '@tanstack/react-router';
import { ChefHat, CircleCheck, Clock, Users } from 'lucide-react';

import { FavoriteRecipeButton } from '@/components/recipes/FavoriteRecipeButton';
import { Badge } from '@/components/ui/badge';
import type { RecipeFilter } from '@/pages/recipes/recipeFilters';
import type { SavedRecipe } from '@/services/recipeService';

interface RecipeCardProps {
	recipe: SavedRecipe;
	filter: RecipeFilter;
	isFavoritePending: boolean;
	onToggleFavorite: () => void;
}

/**
 * Carte recette du design system : photo 16:10 (ou fond accent-50), durée en surimpression,
 * titre en lien couvrant toute la carte ; le bouton favori reste au-dessus du lien.
 */
const RecipeCard: FC<RecipeCardProps> = ({ recipe, filter, isFavoritePending, onToggleFavorite }) => (
	<article className='card group relative flex flex-col overflow-hidden transition-shadow hover:shadow-md'>
		<div className='relative aspect-[16/10] bg-accent-50 text-accent-800'>
			{recipe.imageUrl ? (
				<img src={recipe.imageUrl} alt='' loading='lazy' className='size-full object-cover' />
			) : (
				<span className='flex size-full items-center justify-center'>
					<ChefHat className='size-8' aria-hidden='true' />
				</span>
			)}
			<span className='absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-sm font-medium text-neutral-900'>
				<Clock className='size-4' aria-hidden='true' />
				{recipe.totalTime} min
			</span>
		</div>

		<FavoriteRecipeButton
			isFavorite={recipe.isFavorite}
			isPending={isFavoritePending}
			onToggle={onToggleFavorite}
			recipeName={recipe.name}
			className='absolute right-3 top-3 z-10'
		/>

		<div className='flex flex-1 flex-col gap-2 p-4'>
			<div className='flex flex-wrap items-center gap-2'>
				<Badge variant='secondary'>{recipe.typeLabel}</Badge>
				{recipe.doneAt && (
					<Badge variant='success'>
						<CircleCheck className='size-3.5' aria-hidden='true' />
						Déjà faite
					</Badge>
				)}
			</div>
			<h3 className='type-h3 text-neutral-900'>
				<Link
					to='/app/recipes/$recipeId'
					params={{ recipeId: recipe.id }}
					search={{ filter }}
					className='rounded-sm after:absolute after:inset-0 group-hover:text-accent-700'>
					{recipe.name}
				</Link>
			</h3>
			<p className='mt-auto flex items-center gap-1 text-sm text-neutral-600'>
				<Users className='size-4' aria-hidden='true' />
				{recipe.servings} personne{recipe.servings > 1 ? 's' : ''}
			</p>
		</div>
	</article>
);

export default RecipeCard;
