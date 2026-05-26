import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle2, Clock, ShoppingBasket } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { recipeSuggestionService } from '@/services/recipeSuggestionService';

type RecipeDetailPageProps = {
	recipeId: string;
};

export function RecipeDetailPage({ recipeId }: RecipeDetailPageProps) {
	const {
		data: recipe,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['recipes', 'suggestions', recipeId],
		queryFn: () => recipeSuggestionService.getSuggestionById(recipeId),
	});

	if (isLoading) {
		return (
			<div className='flex min-h-80 items-center justify-center'>
				<div className='size-8 animate-spin rounded-full border-2 border-success-50 border-t-transparent' />
			</div>
		);
	}

	if (isError || !recipe) {
		return (
			<div className='mx-auto max-w-3xl space-y-4 p-4'>
				<Button asChild variant='secondary'>
					<Link to='/app/recipes'>
						<ArrowLeft className='size-4' />
						Retour
					</Link>
				</Button>
				<div className='rounded-lg border border-neutral-200 bg-neutral-50 p-6'>
					<h1 className='text-lg font-semibold text-neutral-900'>
						Recette indisponible
					</h1>
					<p className='mt-1 text-sm text-neutral-600'>
						Cette suggestion n’est plus compatible avec l’inventaire
						actuel.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className='mx-auto max-w-4xl space-y-6 p-4'>
			<Button asChild variant='secondary'>
				<Link to='/app/recipes'>
					<ArrowLeft className='size-4' />
					Retour
				</Link>
			</Button>

			<header className='rounded-lg border border-neutral-200 bg-neutral-50 p-5 shadow-sm'>
				<div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
					<div className='space-y-3'>
						<div className='flex flex-wrap gap-2'>
							<Badge
								variant='outline'
								className='border-success-200 bg-success-50/10 text-success-700'>
								{recipe.matchScore}% stock
							</Badge>
							{recipe.tags.map((tag) => (
								<Badge key={tag} variant='secondary'>
									{tag}
								</Badge>
							))}
						</div>
						<div>
							<h1 className='text-2xl font-semibold text-neutral-900'>
								{recipe.name}
							</h1>
							<p className='mt-2 max-w-2xl text-sm text-neutral-700'>
								{recipe.description}
							</p>
						</div>
					</div>
					<div className='rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700'>
						<div className='flex items-center gap-2 font-semibold text-neutral-900'>
							<Clock className='size-4' />
							{recipe.totalTime} min
						</div>
						<p>{recipe.servings} portions</p>
					</div>
				</div>
			</header>

			<div className='grid gap-4 lg:grid-cols-[1fr_280px]'>
				<section className='rounded-lg border border-neutral-200 bg-neutral-50 p-5 shadow-sm'>
					<h2 className='text-lg font-semibold text-neutral-900'>
						Préparation
					</h2>
					<ol className='mt-4 space-y-3'>
						{recipe.steps.map((step, index) => (
							<li key={step} className='flex gap-3 text-sm text-neutral-700'>
								<span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-success-50 text-xs font-semibold text-neutral-50'>
									{index + 1}
								</span>
								{step}
							</li>
						))}
					</ol>
				</section>

				<aside className='space-y-4'>
					<section className='rounded-lg border border-neutral-200 bg-neutral-50 p-4 shadow-sm'>
						<h2 className='flex items-center gap-2 text-base font-semibold text-neutral-900'>
							<CheckCircle2 className='size-4 text-success-600' />
							Dans le stock
						</h2>
						<ul className='mt-3 space-y-2'>
							{recipe.usedIngredients.map((ingredient) => (
								<li
									key={ingredient.inventoryItemId}
									className='rounded-md bg-neutral-100 px-3 py-2 text-sm'>
									<p className='font-medium text-neutral-900'>
										{ingredient.name}
									</p>
									<p className='text-xs text-neutral-600'>
										Quantité: {ingredient.quantityAvailable}
										{ingredient.daysUntilExpiry !==
											undefined &&
											` · J-${ingredient.daysUntilExpiry}`}
									</p>
								</li>
							))}
						</ul>
					</section>

					<section className='rounded-lg border border-neutral-200 bg-neutral-50 p-4 shadow-sm'>
						<h2 className='flex items-center gap-2 text-base font-semibold text-neutral-900'>
							<ShoppingBasket className='size-4 text-neutral-700' />
							À compléter
						</h2>
						{recipe.missingIngredients.length === 0 ? (
							<p className='mt-2 text-sm text-neutral-600'>
								Aucun ingrédient obligatoire manquant.
							</p>
						) : (
							<ul className='mt-3 space-y-2'>
								{recipe.missingIngredients.map((ingredient) => (
									<li
										key={ingredient}
										className='rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700'>
										{ingredient}
									</li>
								))}
							</ul>
						)}
					</section>
				</aside>
			</div>
		</div>
	);
}
