import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
	ArrowRight,
	BookmarkPlus,
	Check,
	Clock,
	Eye,
	ListChecks,
	Sparkles,
	Trash2,
	Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInventory } from '@/hooks/useInventory';
import {
	GeneratedRecipe,
	RecipeGenerationMode,
	RecipeType,
	recipeService,
} from '@/services/recipeService';
import { useAuthStore } from '@/stores/authStore';
import { getUserFacingErrorMessage } from '@/utils/errorMessages';

const recipeTypes: Array<{ value: RecipeType; label: string }> = [
	{ value: 'STARTER', label: 'Entrée' },
	{ value: 'MAIN', label: 'Plat' },
	{ value: 'DESSERT', label: 'Dessert' },
];

const difficultyLabels = {
	EASY: 'Facile',
	MEDIUM: 'Moyen',
	HARD: 'Difficile',
};

export function RecipeSuggestionsPage() {
	const queryClient = useQueryClient();
	const user = useAuthStore((state) => state.user);
	const refreshProfile = useAuthStore((state) => state.getProfile);
	const canUseRecipes = Boolean(user?.capabilities.canUseRecipes);
	const canGenerateAiRecipes = Boolean(
		user?.capabilities.canGenerateAiRecipes
	);
	const quotaRemaining = user?.capabilities.aiRecipeGenerationRemaining ?? 0;
	const [selectedTypes, setSelectedTypes] = useState<RecipeType[]>(['MAIN']);
	const [servings, setServings] = useState(2);
	const [mode, setMode] = useState<RecipeGenerationMode>('STRICT');
	const [extraIngredientLimit, setExtraIngredientLimit] = useState(3);
	const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>(
		[]
	);
	const [openedRecipeId, setOpenedRecipeId] = useState<string | null>(null);

	const { data: inventory = [] } = useInventory(undefined, {
		enabled: canUseRecipes,
	});
	const nonBasicInventoryCount = inventory.filter((item) => item.product).length;

	const {
		data: savedRecipes = [],
		isLoading: isLoadingSavedRecipes,
		isError: isSavedRecipesError,
	} = useQuery({
		queryKey: ['recipes', 'saved'],
		queryFn: recipeService.listSavedRecipes,
		enabled: canUseRecipes,
	});

	const generationBlockedReason = useMemo(() => {
		if (!canGenerateAiRecipes) return 'La génération IA nécessite Premium.';
		if (quotaRemaining <= 0) return 'Vous avez utilisé vos 5 générations du jour.';
		if (selectedTypes.length === 0) return 'Choisissez au moins une catégorie.';
		if (mode === 'STRICT' && nonBasicInventoryCount < 2) {
			return 'Ajoutez au moins 2 produits pour générer en mode strict.';
		}
		if (mode === 'FLEXIBLE' && nonBasicInventoryCount < 1) {
			return 'Ajoutez au moins 1 produit pour générer avec largesse.';
		}
		return null;
	}, [
		canGenerateAiRecipes,
		mode,
		nonBasicInventoryCount,
		quotaRemaining,
		selectedTypes.length,
	]);

	const generateMutation = useMutation({
		mutationFn: () =>
			recipeService.generateRecipes({
				types: selectedTypes,
				servings,
				mode,
				extraIngredientLimit:
					mode === 'FLEXIBLE' ? extraIngredientLimit : undefined,
			}),
		onSuccess: async (data) => {
			setGeneratedRecipes(data.recipes);
			setOpenedRecipeId(data.recipes[0]?.clientId ?? null);
			await refreshProfile();
			toast.success('Recettes générées');
		},
		onError: (error) => {
			toast.error('Génération impossible', {
				description: getUserFacingErrorMessage(
					error,
					'Impossible de générer les recettes.'
				),
			});
		},
	});

	const saveMutation = useMutation({
		mutationFn: recipeService.saveGeneratedRecipe,
		onSuccess: (savedRecipe, recipeToSave) => {
			setGeneratedRecipes((recipes) =>
				recipes.filter((recipe) => recipe.clientId !== recipeToSave.clientId)
			);
			queryClient.invalidateQueries({ queryKey: ['recipes', 'saved'] });
			toast.success('Recette sauvegardée', {
				description: savedRecipe.imageUrl
					? 'Image générée et associée.'
					: "L'image sera à régénérer plus tard.",
			});
		},
		onError: (error) => {
			toast.error('Sauvegarde impossible', {
				description: getUserFacingErrorMessage(
					error,
					'Impossible de sauvegarder la recette.'
				),
			});
		},
	});

	if (!canUseRecipes) {
		return (
			<div className='mx-auto max-w-3xl p-4'>
				<section className='rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center'>
					<ListChecks className='mx-auto mb-3 size-8 text-success-600' />
					<h1 className='text-xl font-semibold text-neutral-900'>
						Recettes réservées Premium
					</h1>
					<p className='mt-2 text-sm text-neutral-600'>
						Les recettes IA sont incluses avec Premium.
					</p>
					<Button asChild className='mt-5'>
						<Link to='/app/subscription'>Voir les plans</Link>
					</Button>
				</section>
			</div>
		);
	}

	return (
		<div className='mx-auto max-w-6xl space-y-6 p-4'>
			<header className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<p className='text-sm font-medium text-success-700'>
						{quotaRemaining} génération{quotaRemaining > 1 ? 's' : ''} restante
						{quotaRemaining > 1 ? 's' : ''} aujourd’hui
					</p>
					<h1 className='text-2xl font-semibold text-neutral-900'>
						Recettes depuis l’inventaire
					</h1>
				</div>
			</header>

			<section className='rounded-lg border border-neutral-200 bg-neutral-50 p-5 shadow-sm'>
				<div className='grid gap-5 lg:grid-cols-[1.2fr_0.8fr]'>
					<div className='space-y-4'>
						<div>
							<Label>Types de recettes</Label>
							<div className='mt-2 flex flex-wrap gap-2'>
								{recipeTypes.map((type) => {
									const selected = selectedTypes.includes(type.value);
									return (
										<button
											key={type.value}
											type='button'
											onClick={() =>
												setSelectedTypes((current) =>
													selected
														? current.filter((value) => value !== type.value)
														: [...current, type.value]
												)
											}
											className={`rounded-md border px-3 py-2 text-sm font-medium ${
												selected
													? 'border-success-600 bg-success-50/10 text-success-700'
													: 'border-neutral-200 bg-neutral-50 text-neutral-700'
											}`}>
											{selected && <Check className='mr-1 inline size-4' />}
											{type.label}
										</button>
									);
								})}
							</div>
						</div>

						<div className='grid gap-4 sm:grid-cols-2'>
							<div>
								<Label htmlFor='recipe-servings'>Nombre de personnes</Label>
								<Input
									id='recipe-servings'
									type='number'
									min={1}
									max={20}
									value={servings}
									onChange={(event) =>
										setServings(Number(event.target.value))
									}
									className='mt-2'
								/>
							</div>
							<div>
								<Label>Mode</Label>
								<div className='mt-2 grid grid-cols-2 gap-2'>
									<Button
										type='button'
										variant={mode === 'STRICT' ? 'primary' : 'secondary'}
										onClick={() => setMode('STRICT')}>
										Strict
									</Button>
									<Button
										type='button'
										variant={mode === 'FLEXIBLE' ? 'primary' : 'secondary'}
										onClick={() => setMode('FLEXIBLE')}>
										Avec largesse
									</Button>
								</div>
							</div>
						</div>

						{mode === 'FLEXIBLE' && (
							<div>
								<Label htmlFor='extra-ingredients'>
									Ingrédients en plus autorisés : {extraIngredientLimit}
								</Label>
								<input
									id='extra-ingredients'
									type='range'
									min={1}
									max={5}
									value={extraIngredientLimit}
									onChange={(event) =>
										setExtraIngredientLimit(Number(event.target.value))
									}
									className='mt-3 w-full accent-success-600'
								/>
							</div>
						)}
					</div>

					<div className='rounded-lg border border-neutral-200 bg-neutral-100 p-4'>
						<p className='text-sm font-semibold text-neutral-900'>
							Règles MVP
						</p>
						<ul className='mt-3 space-y-2 text-sm text-neutral-700'>
							<li>Une recette par catégorie cochée.</li>
							<li>Basiques gratuits : sel, poivre, eau, huile neutre.</li>
							<li>L’image est créée seulement à la sauvegarde.</li>
						</ul>
						{generationBlockedReason && (
							<p className='mt-4 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800'>
								{generationBlockedReason}
							</p>
						)}
						<Button
							className='mt-4 w-full'
							disabled={Boolean(generationBlockedReason) || generateMutation.isPending}
							onClick={() => generateMutation.mutate()}>
							<Sparkles className='size-4' />
							{generateMutation.isPending ? 'Génération...' : 'Générer'}
						</Button>
					</div>
				</div>
			</section>

			{generatedRecipes.length > 0 && (
				<section className='space-y-4'>
					<h2 className='text-lg font-semibold text-neutral-900'>
						Propositions générées
					</h2>
					<div className='grid gap-4 lg:grid-cols-3'>
						{generatedRecipes.map((recipe) => {
							const opened = openedRecipeId === recipe.clientId;
							return (
								<article
									key={recipe.clientId}
									className='rounded-lg border border-neutral-200 bg-neutral-50 p-4 shadow-sm'>
									<div className='space-y-2'>
										<Badge variant='secondary'>
											{recipeTypes.find((type) => type.value === recipe.type)?.label}
										</Badge>
										<h3 className='text-lg font-semibold text-neutral-900'>
											{recipe.name}
										</h3>
										<p className='text-sm text-neutral-600'>
											{recipe.description}
										</p>
									</div>
									<div className='mt-4 grid grid-cols-3 gap-2 text-sm'>
										<RecipeStat icon={<Clock className='size-4' />}>
											{(recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0)} min
										</RecipeStat>
										<RecipeStat icon={<Users className='size-4' />}>
											{recipe.servings}
										</RecipeStat>
										<RecipeStat>{difficultyLabels[recipe.difficulty]}</RecipeStat>
									</div>
									<div className='mt-4 flex flex-wrap gap-2'>
										<Button
											variant='secondary'
											onClick={() =>
												setOpenedRecipeId(opened ? null : recipe.clientId)
											}>
											<Eye className='size-4' />
											Voir
										</Button>
										<Button
											disabled={saveMutation.isPending}
											onClick={() => {
												setOpenedRecipeId(recipe.clientId);
												saveMutation.mutate(recipe);
											}}>
											<BookmarkPlus className='size-4' />
											Garder
										</Button>
										<Button
											variant='secondary'
											onClick={() =>
												setGeneratedRecipes((recipes) =>
													recipes.filter(
														(item) => item.clientId !== recipe.clientId
													)
												)
											}>
											<Trash2 className='size-4' />
											Drop
										</Button>
									</div>
									{opened && <GeneratedRecipeDetails recipe={recipe} />}
								</article>
							);
						})}
					</div>
				</section>
			)}

			<section className='space-y-4'>
				<h2 className='text-lg font-semibold text-neutral-900'>Mes recettes</h2>
				{isLoadingSavedRecipes ? (
					<div className='rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600'>
						Chargement des recettes...
					</div>
				) : isSavedRecipesError ? (
					<div className='rounded-lg border border-error-100 bg-error-50/10 p-4 text-error-700'>
						Impossible de charger vos recettes.
					</div>
				) : savedRecipes.length === 0 ? (
					<div className='rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600'>
						Aucune recette gardée pour l’instant.
					</div>
				) : (
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
						{savedRecipes.map((recipe) => (
							<article
								key={recipe.id}
								className='overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm'>
								{recipe.imageUrl && (
									<img
										src={recipe.imageUrl}
										alt={recipe.name}
										className='h-40 w-full object-cover'
									/>
								)}
								<div className='p-4'>
									<div className='flex items-center justify-between gap-2'>
										<Badge variant='secondary'>{recipe.typeLabel}</Badge>
										{recipe.doneAt && <Badge variant='outline'>Fait</Badge>}
									</div>
									<h3 className='mt-3 text-lg font-semibold text-neutral-900'>
										{recipe.name}
									</h3>
									<p className='mt-1 text-sm text-neutral-600'>
										{recipe.totalTime} min · {recipe.servings} personne
										{recipe.servings > 1 ? 's' : ''}
									</p>
									<Button asChild className='mt-4 w-full'>
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
					</div>
				)}
			</section>
		</div>
	);
}

function RecipeStat({
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

function GeneratedRecipeDetails({ recipe }: { recipe: GeneratedRecipe }) {
	return (
		<div className='mt-4 space-y-4 border-t border-neutral-200 pt-4'>
			<div>
				<p className='text-xs font-semibold uppercase text-neutral-600'>
					Ingrédients
				</p>
				<div className='mt-2 flex flex-wrap gap-2'>
					{recipe.ingredients.map((ingredient) => (
						<span
							key={`${ingredient.source}-${ingredient.name}`}
							className='rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700'>
							{ingredient.name}
							{ingredient.source === 'MISSING' ? ' · à ajouter' : ''}
						</span>
					))}
				</div>
			</div>
			<div>
				<p className='text-xs font-semibold uppercase text-neutral-600'>
					Préparation
				</p>
				<ol className='mt-2 space-y-2 text-sm text-neutral-700'>
					{recipe.steps.map((step, index) => (
						<li key={step}>
							<span className='font-semibold'>{index + 1}.</span> {step}
						</li>
					))}
				</ol>
			</div>
		</div>
	);
}
