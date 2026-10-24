import type { ReactNode } from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import {
	ArrowLeft,
	ChefHat,
	CheckCircle2,
	CircleCheck,
	Clock,
	Gauge,
	Loader2,
	ShoppingBasket,
	Users,
} from 'lucide-react';
import { toast } from 'sonner';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FavoriteRecipeButton } from '@/components/recipes/FavoriteRecipeButton';
import { useRecipeFavoriteMutation } from '@/hooks/useRecipeFavoriteMutation';
import {
	CompletionPreview,
	recipeService,
	SavedRecipe,
} from '@/services/recipeService';
import { useAuthStore } from '@/stores/authStore';
import { getUserFacingErrorMessage } from '@/utils/errorMessages';
import { RecipeFilter } from './recipeFilters';
import WidgetCard from '@/components/common/WidgetCard';
import { cn } from '@/lib/utils';

type RecipeDetailPageProps = {
	recipeId: string;
};

const difficultyLabels = {
	EASY: 'Facile',
	MEDIUM: 'Moyen',
	HARD: 'Difficile',
};

export function RecipeDetailPage({ recipeId }: RecipeDetailPageProps) {
	const queryClient = useQueryClient();
	const search = useSearch({ strict: false }) as { filter?: RecipeFilter };
	const activeFilter = search.filter ?? 'all';
	const user = useAuthStore((state) => state.user);
	const canUseRecipes = Boolean(user?.capabilities.canUseRecipes);
	const [completionPreview, setCompletionPreview] =
		useState<CompletionPreview | null>(null);
	const [selectedInventoryItemIds, setSelectedInventoryItemIds] = useState<
		string[]
	>([]);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	const {
		data: recipe,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['recipes', 'saved', recipeId],
		queryFn: () => recipeService.getSavedRecipe(recipeId),
		enabled: canUseRecipes,
	});
	const favoriteMutation = useRecipeFavoriteMutation();

	const previewMutation = useMutation({
		mutationFn: recipeService.getCompletionPreview,
		onSuccess: (preview) => {
			setCompletionPreview(preview);
			setSelectedInventoryItemIds(
				preview.items.map((item) => item.inventoryItemId)
			);
			setIsConfirmOpen(true);
		},
		onError: (error) => {
			toast.error('Action impossible', {
				description: getUserFacingErrorMessage(
					error,
					'Impossible de préparer la confirmation.'
				),
			});
		},
	});

	const completeMutation = useMutation({
		mutationFn: ({
			recipeId,
			inventoryItemIds,
		}: {
			recipeId: string;
			inventoryItemIds: string[];
		}) => recipeService.completeRecipe(recipeId, inventoryItemIds),
		onSuccess: (data) => {
			queryClient.setQueryData(['recipes', 'saved', recipeId], data.recipe);
			queryClient.invalidateQueries({ queryKey: ['recipes', 'saved'] });
			queryClient.invalidateQueries({ queryKey: ['inventory'] });
			setIsConfirmOpen(false);
			setCompletionPreview(null);
			setSelectedInventoryItemIds([]);
			toast.success('Recette marquée comme faite', {
				description:
					data.removedItems.length > 0
						? `${data.removedItems.length} produit(s) retiré(s) de l’inventaire.`
						: 'Aucun produit à retirer.',
			});
		},
		onError: (error) => {
			toast.error('Action impossible', {
				description: getUserFacingErrorMessage(
					error,
					'Impossible de mettre à jour l’inventaire.'
				),
			});
		},
	});

	if (!canUseRecipes) {
		return (
			<div className='mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-12 lg:py-6'>
				<p role='status' className='rounded-lg bg-warning-50 p-4 text-warning-700'>
					Les recettes sont réservées Premium.
				</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<p role='status' className='flex min-h-80 items-center justify-center gap-3 text-neutral-600'>
				<Loader2 className='size-6 animate-spin text-accent-600' aria-hidden='true' />
				Chargement de la recette…
			</p>
		);
	}

	if (isError || !recipe) {
		return (
			<div className='mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-12 lg:py-6'>
				<BackButton filter={activeFilter} />
				<div className='card p-6'>
					<h1 className='type-h2 text-neutral-900'>Recette indisponible</h1>
					<p className='mt-1 text-neutral-700'>
						Cette recette n’existe pas ou n’est plus accessible.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className='mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-6 lg:px-12 lg:py-6'>
			<BackButton filter={activeFilter} />
			<header className='card relative overflow-hidden'>
				<FavoriteRecipeButton
					isFavorite={recipe.isFavorite}
					isPending={favoriteMutation.isPending}
					onToggle={() =>
						favoriteMutation.mutate({
							recipeId: recipe.id,
							isFavorite: !recipe.isFavorite,
						})
					}
					className='absolute right-4 top-4 z-10'
				/>
				<div className='aspect-[16/9] max-h-80 w-full bg-accent-50 text-accent-800 sm:aspect-[21/9]'>
					{recipe.imageUrl ? (
						<img src={recipe.imageUrl} alt='' className='size-full object-cover' />
					) : (
						<span className='flex size-full items-center justify-center'>
							<ChefHat className='size-12' aria-hidden='true' />
						</span>
					)}
				</div>
				<div className='flex flex-col gap-3 p-4 sm:p-5'>
					<div className='flex flex-wrap gap-2'>
						<Badge variant='secondary'>{recipe.typeLabel}</Badge>
						{recipe.doneAt && (
							<Badge variant='success'>
								<CircleCheck className='size-3.5' aria-hidden='true' />
								Déjà faite
							</Badge>
						)}
					</div>
					<h1 className='type-h1 text-neutral-900'>{recipe.name}</h1>
					{recipe.description && (
						<p className='max-w-2xl text-neutral-700'>{recipe.description}</p>
					)}
					<ul className='flex flex-wrap gap-2 text-sm'>
						<Stat icon={<Clock className='size-4' aria-hidden='true' />}>
							{recipe.totalTime} min
						</Stat>
						<Stat icon={<Users className='size-4' aria-hidden='true' />}>
							{recipe.servings} personne{recipe.servings > 1 ? 's' : ''}
						</Stat>
						<Stat icon={<Gauge className='size-4' aria-hidden='true' />}>
							{difficultyLabels[recipe.difficulty]}
						</Stat>
						<Stat icon={<ShoppingBasket className='size-4' aria-hidden='true' />}>
							{recipe.ingredients.length} ingrédient{recipe.ingredients.length > 1 ? 's' : ''}
						</Stat>
					</ul>
				</div>
			</header>

			<div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6'>
				<WidgetCard title='Préparation'>
					<ol className='flex flex-col gap-4'>
						{recipe.steps.map((step, index) => (
							<li key={step} className='flex gap-3 text-neutral-700'>
								<span
									aria-hidden='true'
									className='flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-600 text-sm font-semibold text-surface'>
									{index + 1}
								</span>
								<span className='pt-0.5'>{step}</span>
							</li>
						))}
					</ol>
				</WidgetCard>

				<aside className='flex min-w-0 flex-col gap-4 lg:sticky lg:top-20'>
					<IngredientList recipe={recipe} />
					<Button
						className='w-full'
						disabled={Boolean(recipe.doneAt) || previewMutation.isPending}
						onClick={() => previewMutation.mutate(recipe.id)}>
						<CheckCircle2 aria-hidden='true' />
						{recipe.doneAt ? 'Déjà fait' : 'Marquer comme fait'}
					</Button>
				</aside>
			</div>

			<AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Marquer la recette comme faite ?</AlertDialogTitle>
						<AlertDialogDescription>
							Choisissez les ingrédients utilisés à retirer de l’inventaire. Les
							basiques et ingrédients manquants ne seront pas modifiés.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{completionPreview?.items.length ? (
						<div className='space-y-3'>
							<div className='flex gap-2'>
								<Button
									type='button'
									variant='secondary'
									size='sm'
									onClick={() =>
										setSelectedInventoryItemIds(
											completionPreview.items.map(
												(item) => item.inventoryItemId
											)
										)
									}>
									Tout retirer
								</Button>
								<Button
									type='button'
									variant='secondary'
									size='sm'
									onClick={() => setSelectedInventoryItemIds([])}>
									Tout conserver
								</Button>
							</div>
							<ul className='space-y-2 text-sm text-neutral-700'>
								{completionPreview.items.map((item) => {
									const isSelected = selectedInventoryItemIds.includes(
										item.inventoryItemId
									);

									return (
										<li key={item.inventoryItemId}>
											<label className='flex min-h-11 cursor-pointer items-center gap-3 rounded-md bg-neutral-50 px-3 py-2'>
												<input
													type='checkbox'
													className='size-4 accent-accent-600'
													checked={isSelected}
													onChange={() =>
														setSelectedInventoryItemIds((selectedIds) =>
															isSelected
																? selectedIds.filter(
																	(id) => id !== item.inventoryItemId
																  )
																: [...selectedIds, item.inventoryItemId]
														)
													}
												/>
												<span>Retirer {item.name}</span>
											</label>
										</li>
									);
								})}
							</ul>
						</div>
					) : (
						<p className='text-sm text-neutral-600'>
							Aucun produit de l’inventaire ne sera retiré.
						</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							disabled={completeMutation.isPending}
							onClick={() =>
								completeMutation.mutate({
									recipeId: recipe.id,
									inventoryItemIds: selectedInventoryItemIds,
								})
							}>
							Confirmer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function BackButton({ filter }: { filter: RecipeFilter }) {
	return (
		<Button asChild variant='ghost' className='-ml-3 self-start'>
			<Link to='/app/recipes' search={{ filter }}>
				<ArrowLeft aria-hidden='true' />
				Mes recettes
			</Link>
		</Button>
	);
}

function Stat({ children, icon }: { children: ReactNode; icon: ReactNode }) {
	return (
		<li className='inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-900'>
			{icon}
			{children}
		</li>
	);
}

function IngredientList({ recipe }: { recipe: SavedRecipe }) {
	const inventoryIngredients = recipe.ingredients.filter(
		(ingredient) => ingredient.source === 'INVENTORY'
	);
	const basicIngredients = recipe.ingredients.filter(
		(ingredient) => ingredient.source === 'BASIC'
	);
	const missingIngredients = recipe.ingredients.filter(
		(ingredient) => ingredient.source === 'MISSING'
	);

	return (
		<WidgetCard title='Ingrédients'>
			<div className='flex flex-col gap-4'>
				<IngredientGroup title='Dans votre inventaire' ingredients={inventoryIngredients} />
				<IngredientGroup title='Basiques' ingredients={basicIngredients} />
				<IngredientGroup title='À acheter' ingredients={missingIngredients} tone='warning' />
			</div>
		</WidgetCard>
	);
}

function IngredientGroup({
	title,
	ingredients,
	tone = 'neutral',
}: {
	title: string;
	ingredients: SavedRecipe['ingredients'];
	tone?: 'neutral' | 'warning';
}) {
	if (ingredients.length === 0) return null;

	return (
		<div>
			<h3 className='text-sm font-medium text-neutral-600'>{title}</h3>
			<ul className='mt-2 divide-y divide-neutral-200'>
				{ingredients.map((ingredient) => (
					<li
						key={ingredient.id}
						className={cn(
							'flex justify-between gap-3 py-2 text-neutral-900',
							tone === 'warning' && 'text-warning-700'
						)}>
						<span>{ingredient.name}</span>
						{(ingredient.quantity || ingredient.unit) && (
							<span className='shrink-0 text-neutral-600'>
								{ingredient.quantity}
								{ingredient.unit ? ` ${ingredient.unit}` : ''}
							</span>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
