import type { ReactNode } from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
	ArrowLeft,
	CheckCircle2,
	Clock,
	ImageOff,
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
import {
	CompletionPreview,
	recipeService,
	SavedRecipe,
} from '@/services/recipeService';
import { useAuthStore } from '@/stores/authStore';
import { getUserFacingErrorMessage } from '@/utils/errorMessages';

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
	const user = useAuthStore((state) => state.user);
	const canUseRecipes = Boolean(user?.capabilities.canUseRecipes);
	const [completionPreview, setCompletionPreview] =
		useState<CompletionPreview | null>(null);
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

	const previewMutation = useMutation({
		mutationFn: recipeService.getCompletionPreview,
		onSuccess: (preview) => {
			setCompletionPreview(preview);
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
		mutationFn: recipeService.completeRecipe,
		onSuccess: (data) => {
			queryClient.setQueryData(['recipes', 'saved', recipeId], data.recipe);
			queryClient.invalidateQueries({ queryKey: ['recipes', 'saved'] });
			queryClient.invalidateQueries({ queryKey: ['inventory'] });
			setIsConfirmOpen(false);
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
			<div className='mx-auto max-w-3xl p-4'>
				<div className='rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800'>
					Les recettes sont réservées Premium.
				</div>
			</div>
		);
	}

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
				<BackButton />
				<div className='rounded-lg border border-neutral-200 bg-neutral-50 p-6'>
					<h1 className='text-lg font-semibold text-neutral-900'>
						Recette indisponible
					</h1>
					<p className='mt-1 text-sm text-neutral-600'>
						Cette recette n’existe pas ou n’est plus accessible.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className='mx-auto max-w-5xl space-y-6 p-4'>
			<BackButton />
			<header className='overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm'>
				{recipe.imageUrl ? (
					<img
						src={recipe.imageUrl}
						alt={recipe.name}
						className='h-72 w-full object-cover'
					/>
				) : (
					<div className='flex h-56 items-center justify-center bg-neutral-100 text-neutral-500'>
						<ImageOff className='mr-2 size-5' />
						Image indisponible
					</div>
				)}
				<div className='p-5'>
					<div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
						<div>
							<div className='flex flex-wrap gap-2'>
								<Badge variant='secondary'>{recipe.typeLabel}</Badge>
								<Badge variant='outline'>
									{difficultyLabels[recipe.difficulty]}
								</Badge>
								{recipe.doneAt && <Badge variant='outline'>Fait</Badge>}
							</div>
							<h1 className='mt-3 text-2xl font-semibold text-neutral-900'>
								{recipe.name}
							</h1>
							{recipe.description && (
								<p className='mt-2 max-w-2xl text-sm text-neutral-700'>
									{recipe.description}
								</p>
							)}
						</div>
						<div className='grid grid-cols-3 gap-2 text-sm sm:min-w-72'>
							<Stat icon={<Clock className='size-4' />}>
								{recipe.totalTime} min
							</Stat>
							<Stat icon={<Users className='size-4' />}>
								{recipe.servings}
							</Stat>
							<Stat>{recipe.ingredients.length} ing.</Stat>
						</div>
					</div>
				</div>
			</header>

			<div className='grid gap-4 lg:grid-cols-[1fr_320px]'>
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
					<IngredientList recipe={recipe} />
					<Button
						className='w-full'
						disabled={Boolean(recipe.doneAt) || previewMutation.isPending}
						onClick={() => previewMutation.mutate(recipe.id)}>
						<CheckCircle2 className='size-4' />
						{recipe.doneAt ? 'Déjà fait' : 'Marquer comme fait'}
					</Button>
				</aside>
			</div>

			<AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Marquer la recette comme faite ?</AlertDialogTitle>
						<AlertDialogDescription>
							Les produits suivants seront retirés de l’inventaire. Les basiques
							et ingrédients manquants ne seront pas modifiés.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{completionPreview?.items.length ? (
						<ul className='space-y-2 text-sm text-neutral-700'>
							{completionPreview.items.map((item) => (
								<li
									key={item.inventoryItemId}
									className='rounded-md bg-neutral-100 px-3 py-2'>
									{item.name}
								</li>
							))}
						</ul>
					) : (
						<p className='text-sm text-neutral-600'>
							Aucun produit de l’inventaire ne sera retiré.
						</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							disabled={completeMutation.isPending}
							onClick={() => completeMutation.mutate(recipe.id)}>
							Confirmer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function BackButton() {
	return (
		<Button asChild variant='secondary'>
			<Link to='/app/recipes'>
				<ArrowLeft className='size-4' />
				Retour
			</Link>
		</Button>
	);
}

function Stat({
	children,
	icon,
}: {
	children: ReactNode;
	icon?: ReactNode;
}) {
	return (
		<div className='rounded-md bg-neutral-100 px-3 py-2 font-semibold text-neutral-900'>
			<span className='flex items-center gap-1'>
				{icon}
				{children}
			</span>
		</div>
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
		<section className='rounded-lg border border-neutral-200 bg-neutral-50 p-4 shadow-sm'>
			<h2 className='flex items-center gap-2 text-base font-semibold text-neutral-900'>
				<ShoppingBasket className='size-4 text-neutral-700' />
				Ingrédients
			</h2>
			<IngredientGroup title='Inventaire' ingredients={inventoryIngredients} />
			<IngredientGroup title='Basiques' ingredients={basicIngredients} />
			<IngredientGroup title='À compléter' ingredients={missingIngredients} />
		</section>
	);
}

function IngredientGroup({
	title,
	ingredients,
}: {
	title: string;
	ingredients: SavedRecipe['ingredients'];
}) {
	if (ingredients.length === 0) return null;

	return (
		<div className='mt-4'>
			<p className='text-xs font-semibold uppercase text-neutral-600'>{title}</p>
			<ul className='mt-2 space-y-2'>
				{ingredients.map((ingredient) => (
					<li
						key={ingredient.id}
						className='rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700'>
						{ingredient.name}
						{ingredient.quantity ? ` · ${ingredient.quantity}` : ''}
						{ingredient.unit ? ` ${ingredient.unit}` : ''}
					</li>
				))}
			</ul>
		</div>
	);
}
