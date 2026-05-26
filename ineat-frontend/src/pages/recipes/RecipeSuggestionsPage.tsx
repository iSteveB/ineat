import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
	AlertTriangle,
	ArrowRight,
	Clock,
	ListChecks,
	Plus,
	Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { recipeSuggestionService } from '@/services/recipeSuggestionService';

export function RecipeSuggestionsPage() {
	const {
		data: suggestions = [],
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['recipes', 'suggestions'],
		queryFn: () => recipeSuggestionService.getSuggestions(),
	});

	if (isLoading) {
		return (
			<div className='flex min-h-80 items-center justify-center'>
				<div className='size-8 animate-spin rounded-full border-2 border-success-50 border-t-transparent' />
			</div>
		);
	}

	if (isError) {
		return (
			<div className='mx-auto max-w-3xl p-4'>
				<div className='rounded-lg border border-error-100 bg-error-50/10 p-4 text-error-700'>
					Impossible de charger les suggestions de recettes.
				</div>
			</div>
		);
	}

	return (
		<div className='mx-auto max-w-5xl space-y-6 p-4'>
			<header className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<p className='text-sm font-medium text-success-700'>
						{suggestions.length} suggestion
						{suggestions.length > 1 ? 's' : ''}
					</p>
					<h1 className='text-2xl font-semibold text-neutral-900'>
						Recettes depuis l’inventaire
					</h1>
				</div>
				<Button asChild variant='secondary'>
					<Link to='/app/inventory/add'>
						<Plus className='size-4' />
						Ajouter un produit
					</Link>
				</Button>
			</header>

			{suggestions.length === 0 ? (
				<section className='rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center'>
					<ListChecks className='mx-auto mb-3 size-8 text-success-600' />
					<h2 className='text-lg font-semibold text-neutral-900'>
						Inventaire insuffisant
					</h2>
					<p className='mt-1 text-sm text-neutral-600'>
						Ajoutez au moins deux produits compatibles pour obtenir des
						recettes actionnables.
					</p>
				</section>
			) : (
				<section className='grid gap-4 md:grid-cols-2'>
					{suggestions.map((recipe) => (
						<article
							key={recipe.id}
							className='rounded-lg border border-neutral-200 bg-neutral-50 p-4 shadow-sm'>
							<div className='flex items-start justify-between gap-3'>
								<div className='space-y-2'>
									<div className='flex flex-wrap items-center gap-2'>
										<Badge
											variant='outline'
											className='border-success-200 bg-success-50/10 text-success-700'>
											{recipe.matchScore}% stock
										</Badge>
										{recipe.priorityIngredients.length >
											0 && (
											<Badge
												variant='outline'
												className='border-orange-200 bg-orange-50 text-orange-800'>
												<AlertTriangle className='mr-1 size-3' />
												à prioriser
											</Badge>
										)}
									</div>
									<h2 className='text-lg font-semibold text-neutral-900'>
										{recipe.name}
									</h2>
									<p className='text-sm text-neutral-700'>
										{recipe.description}
									</p>
								</div>
							</div>

							<div className='mt-4 grid grid-cols-3 gap-2 text-sm'>
								<div className='rounded-md bg-neutral-100 px-3 py-2'>
									<div className='flex items-center gap-1 font-semibold text-neutral-900'>
										<Clock className='size-4' />
										{recipe.totalTime} min
									</div>
									<p className='text-xs text-neutral-600'>
										temps total
									</p>
								</div>
								<div className='rounded-md bg-neutral-100 px-3 py-2'>
									<div className='flex items-center gap-1 font-semibold text-neutral-900'>
										<Users className='size-4' />
										{recipe.servings}
									</div>
									<p className='text-xs text-neutral-600'>
										portions
									</p>
								</div>
								<div className='rounded-md bg-neutral-100 px-3 py-2'>
									<p className='font-semibold text-neutral-900'>
										{recipe.missingIngredients.length}
									</p>
									<p className='text-xs text-neutral-600'>
										manquant
										{recipe.missingIngredients.length > 1
											? 's'
											: ''}
									</p>
								</div>
							</div>

							<div className='mt-4 space-y-2'>
								<p className='text-xs font-semibold uppercase text-neutral-600'>
									Stock utilisé
								</p>
								<div className='flex flex-wrap gap-2'>
									{recipe.usedIngredients
										.slice(0, 4)
										.map((ingredient) => (
											<span
												key={ingredient.inventoryItemId}
												className='rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700'>
												{ingredient.name}
											</span>
										))}
								</div>
							</div>

							<div className='mt-4 flex justify-end'>
								<Button asChild>
									<Link
										to='/app/recipes/$recipeId'
										params={{ recipeId: recipe.id }}>
										Ouvrir
										<ArrowRight className='size-4' />
									</Link>
								</Button>
							</div>
						</article>
					))}
				</section>
			)}
		</div>
	);
}
