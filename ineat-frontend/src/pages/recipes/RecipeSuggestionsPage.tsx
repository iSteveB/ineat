import type { ReactNode } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import {
	BookmarkPlus,
	Check,
	ChefHat,
	ChevronDown,
	Clock,
	Gauge,
	Info,
	Loader2,
	Sparkles,
	Users,
	X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInventory } from '@/hooks/useInventory';
import RecipeCard from '@/components/recipes/RecipeCard';
import { useRecipeFavoriteMutation } from '@/hooks/useRecipeFavoriteMutation';
import {
	GeneratedRecipe,
	RecipeGenerationMode,
	RecipeType,
	recipeService,
} from '@/services/recipeService';
import { useAuthStore } from '@/stores/authStore';
import { getUserFacingErrorMessage } from '@/utils/errorMessages';
import { RecipeFilter } from './recipeFilters';
import { cn } from '@/lib/utils';

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

const savedRecipeFilters: Array<{ value: RecipeFilter; label: string }> = [
	{ value: 'all', label: 'Toutes' },
	{ value: 'favorites', label: 'Favoris' },
	{ value: 'pending', label: 'À faire' },
	{ value: 'done', label: 'Déjà faites' },
];

export function RecipeSuggestionsPage() {
	const queryClient = useQueryClient();
	const search = useSearch({ strict: false }) as { filter?: RecipeFilter };
	const activeFilter = search.filter ?? 'all';
	const user = useAuthStore((state) => state.user);
	const refreshProfile = useAuthStore((state) => state.getProfile);
	const canUseRecipes = Boolean(user?.capabilities.canUseRecipes);
	const canGenerateAiRecipes = Boolean(
		user?.capabilities.canGenerateAiRecipes
	);
	const quotaRemaining = user?.capabilities.aiRecipeGenerationRemaining ?? 0;
	const [selectedTypes, setSelectedTypes] = useState<RecipeType[]>(['MAIN']);
	const [servings, setServings] = useState(user?.defaultServings ?? 4);
	const [mode, setMode] = useState<RecipeGenerationMode>('STRICT');
	const [extraIngredientLimit, setExtraIngredientLimit] = useState(3);
	const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>(
		[]
	);
	const [openedRecipeId, setOpenedRecipeId] = useState<string | null>(null);

	useEffect(() => {
		setServings(user?.defaultServings ?? 4);
	}, [user?.defaultServings]);

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
	const favoriteMutation = useRecipeFavoriteMutation();
	const filteredSavedRecipes = useMemo(() => {
		switch (activeFilter) {
			case 'favorites':
				return savedRecipes.filter((recipe) => recipe.isFavorite);
			case 'pending':
				return savedRecipes.filter((recipe) => !recipe.doneAt);
			case 'done':
				return savedRecipes.filter((recipe) => Boolean(recipe.doneAt));
			default:
				return savedRecipes;
		}
	}, [activeFilter, savedRecipes]);

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
		onSuccess: async (savedRecipe, recipeToSave) => {
			setGeneratedRecipes((recipes) =>
				recipes.filter((recipe) => recipe.clientId !== recipeToSave.clientId)
			);
			queryClient.invalidateQueries({ queryKey: ['recipes', 'saved'] });
			await refreshProfile();
			toast.success('Recette sauvegardée', {
				description: savedRecipe.imageUrl
					? 'Image générée et associée.'
					: 'Recette sauvegardée sans image.',
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
			<div className='mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-12 lg:py-6'>
				<section className='card flex flex-col items-center gap-3 px-6 py-12 text-center'>
					<span className='flex size-14 items-center justify-center rounded-lg bg-brand-50 text-brand-800'>
						<ChefHat className='size-7' aria-hidden='true' />
					</span>
					<h1 className='type-h2 text-neutral-900'>Recettes réservées Premium</h1>
					<p className='max-w-md text-neutral-700'>
						Les recettes générées à partir de votre inventaire sont incluses avec Premium.
					</p>
					<Button asChild variant='brand' className='mt-2'>
						<Link to='/app/subscription'>Voir les plans</Link>
					</Button>
				</section>
			</div>
		);
	}

	return (
		<div className='mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:px-6 lg:gap-8 lg:px-12 lg:py-6'>
			<header className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h1 className='type-h1 text-neutral-900'>Recettes</h1>
					<p className='text-sm text-neutral-600'>
						Des idées de repas à partir de ce que vous avez déjà.
					</p>
				</div>
				<p className='inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-sm font-medium text-accent-800'>
					<Sparkles className='size-4' aria-hidden='true' />
					{quotaRemaining} génération{quotaRemaining > 1 ? 's' : ''} restante
					{quotaRemaining > 1 ? 's' : ''} aujourd’hui
				</p>
			</header>

			<section aria-labelledby='recipe-generator-title' className='card p-4 sm:p-5'>
				<h2 id='recipe-generator-title' className='type-h2 text-neutral-900'>
					Générer des idées
				</h2>
				<div className='mt-4 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]'>
					<div className='flex flex-col gap-5'>
						<fieldset>
							<legend className='text-sm font-medium text-neutral-900'>Types de recettes</legend>
							<div className='mt-2 flex flex-wrap gap-2'>
								{recipeTypes.map((type) => {
									const selected = selectedTypes.includes(type.value);
									return (
										<button
											key={type.value}
											type='button'
											aria-pressed={selected}
											onClick={() =>
												setSelectedTypes((current) =>
													selected
														? current.filter((value) => value !== type.value)
														: [...current, type.value]
												)
											}
											className={cn(
												'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors',
												selected
													? 'border-accent-600 bg-accent-600 text-surface'
													: 'border-neutral-300 bg-surface text-neutral-700 hover:border-accent-600 hover:text-accent-700'
											)}>
											{selected && <Check className='size-4' aria-hidden='true' />}
											{type.label}
										</button>
									);
								})}
							</div>
						</fieldset>

						<div className='grid gap-5 sm:grid-cols-2'>
							<div className='flex flex-col gap-1.5'>
								<label htmlFor='recipe-servings' className='text-sm font-medium text-neutral-900'>
									Nombre de personnes
								</label>
								<Input
									id='recipe-servings'
									type='number'
									inputMode='numeric'
									min={1}
									max={20}
									value={servings}
									onChange={(event) => setServings(Number(event.target.value))}
									className='h-11'
								/>
							</div>
							<fieldset>
								<legend className='text-sm font-medium text-neutral-900'>Mode</legend>
								<div className='mt-1.5 grid grid-cols-2 gap-2'>
									<Button
										type='button'
										aria-pressed={mode === 'STRICT'}
										variant={mode === 'STRICT' ? 'primary' : 'secondary'}
										onClick={() => setMode('STRICT')}>
										Strict
									</Button>
									<Button
										type='button'
										aria-pressed={mode === 'FLEXIBLE'}
										variant={mode === 'FLEXIBLE' ? 'primary' : 'secondary'}
										onClick={() => setMode('FLEXIBLE')}>
										Avec largesse
									</Button>
								</div>
								<p className='mt-1.5 text-sm text-neutral-600'>
									{mode === 'STRICT'
										? 'Uniquement vos produits et les basiques.'
										: 'Quelques ingrédients à acheter en plus.'}
								</p>
							</fieldset>
						</div>

						{mode === 'FLEXIBLE' && (
							<div className='flex flex-col gap-1.5'>
								<label htmlFor='extra-ingredients' className='text-sm font-medium text-neutral-900'>
									Ingrédients en plus autorisés : {extraIngredientLimit}
								</label>
								<input
									id='extra-ingredients'
									type='range'
									min={1}
									max={5}
									value={extraIngredientLimit}
									onChange={(event) => setExtraIngredientLimit(Number(event.target.value))}
									className='h-11 w-full cursor-pointer accent-accent-600'
								/>
							</div>
						)}
					</div>

					<div className='flex flex-col gap-3 rounded-lg bg-neutral-50 p-4'>
						<p className='flex items-center gap-2 font-medium text-neutral-900'>
							<Info className='size-4 text-accent-700' aria-hidden='true' />
							Bon à savoir
						</p>
						<ul className='flex list-disc flex-col gap-1.5 pl-5 text-sm text-neutral-700'>
							<li>Une recette par type coché.</li>
							<li>Sel, poivre, eau et huile neutre sont toujours disponibles.</li>
							<li>La photo de la recette est créée quand vous la gardez.</li>
						</ul>
						<p role='status' className={cn(generationBlockedReason && 'rounded-md bg-warning-50 px-3 py-2 text-sm text-warning-700')}>
							{generationBlockedReason}
						</p>
						<Button
							className='mt-auto w-full'
							disabled={Boolean(generationBlockedReason) || generateMutation.isPending}
							onClick={() => generateMutation.mutate()}>
							{generateMutation.isPending ? (
								<Loader2 className='animate-spin' aria-hidden='true' />
							) : (
								<Sparkles aria-hidden='true' />
							)}
							{generateMutation.isPending ? 'Génération…' : 'Générer'}
						</Button>
					</div>
				</div>
			</section>

			{generatedRecipes.length > 0 && (
				<section aria-labelledby='generated-recipes-title' className='flex flex-col gap-4'>
					<h2 id='generated-recipes-title' className='type-h2 text-neutral-900'>
						Propositions
					</h2>
					<ul className='grid grid-cols-1 items-start gap-4 lg:grid-cols-3'>
						{generatedRecipes.map((recipe) => (
							<li key={recipe.clientId} className='min-w-0'>
								<GeneratedRecipeCard
									recipe={recipe}
									isOpen={openedRecipeId === recipe.clientId}
									isSaving={saveMutation.isPending}
									onToggle={() =>
										setOpenedRecipeId(openedRecipeId === recipe.clientId ? null : recipe.clientId)
									}
									onSave={() => {
										setOpenedRecipeId(recipe.clientId);
										saveMutation.mutate(recipe);
									}}
									onDismiss={() =>
										setGeneratedRecipes((recipes) =>
											recipes.filter((item) => item.clientId !== recipe.clientId)
										)
									}
								/>
							</li>
						))}
					</ul>
				</section>
			)}

			<section aria-labelledby='saved-recipes-title' className='flex flex-col gap-4'>
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<h2 id='saved-recipes-title' className='type-h2 text-neutral-900'>
						Mes recettes
					</h2>
					<nav aria-label='Filtrer mes recettes' className='-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 py-1'>
						{savedRecipeFilters.map((filter) => {
							const isActive = activeFilter === filter.value;
							return (
								<Link
									key={filter.value}
									to='/app/recipes'
									search={{ filter: filter.value }}
									aria-current={isActive ? 'page' : undefined}
									className={cn(
										'inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors',
										isActive
											? 'border-accent-600 bg-accent-600 text-surface'
											: 'border-neutral-300 bg-surface text-neutral-700 hover:border-accent-600 hover:text-accent-700'
									)}>
									{filter.label}
								</Link>
							);
						})}
					</nav>
				</div>
				{isLoadingSavedRecipes ? (
					<p role='status' className='flex items-center gap-2 py-8 text-neutral-600'>
						<Loader2 className='size-5 animate-spin text-accent-600' aria-hidden='true' />
						Chargement des recettes…
					</p>
				) : isSavedRecipesError ? (
					<p role='alert' className='rounded-lg bg-danger-50 p-4 text-danger-700'>
						Impossible de charger vos recettes.
					</p>
				) : filteredSavedRecipes.length === 0 ? (
					<p className='card p-6 text-neutral-700'>
						{savedRecipes.length === 0
							? 'Aucune recette gardée pour l’instant. Générez des idées puis gardez celles qui vous plaisent.'
							: activeFilter === 'favorites'
								? 'Vous n’avez pas encore de recette favorite.'
								: 'Aucune recette ne correspond à ce filtre.'}
					</p>
				) : (
					<ul className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
						{filteredSavedRecipes.map((recipe) => (
							<li key={recipe.id} className='min-w-0'>
								<RecipeCard
									recipe={recipe}
									filter={activeFilter}
									isFavoritePending={
										favoriteMutation.isPending &&
										favoriteMutation.variables?.recipeId === recipe.id
									}
									onToggleFavorite={() =>
										favoriteMutation.mutate({
											recipeId: recipe.id,
											isFavorite: !recipe.isFavorite,
										})
									}
								/>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function RecipeStat({ children, icon }: { children: ReactNode; icon: ReactNode }) {
	return (
		<span className='inline-flex items-center gap-1 text-sm text-neutral-700'>
			{icon}
			{children}
		</span>
	);
}

function GeneratedRecipeCard({
	recipe,
	isOpen,
	isSaving,
	onToggle,
	onSave,
	onDismiss,
}: {
	recipe: GeneratedRecipe;
	isOpen: boolean;
	isSaving: boolean;
	onToggle: () => void;
	onSave: () => void;
	onDismiss: () => void;
}) {
	const detailsId = useId();
	const missingCount = recipe.ingredients.filter((ingredient) => ingredient.source === 'MISSING').length;

	return (
		<article className='card flex flex-col gap-3 p-4'>
			<div className='flex flex-wrap items-center gap-2'>
				<Badge variant='secondary'>
					{recipeTypes.find((type) => type.value === recipe.type)?.label}
				</Badge>
				{missingCount > 0 && (
					<Badge variant='warning'>
						{missingCount} ingrédient{missingCount > 1 ? 's' : ''} à acheter
					</Badge>
				)}
			</div>
			<h3 className='type-h3 text-neutral-900'>{recipe.name}</h3>
			<p className='text-sm text-neutral-700'>{recipe.description}</p>
			<div className='flex flex-wrap gap-x-4 gap-y-1'>
				<RecipeStat icon={<Clock className='size-4' aria-hidden='true' />}>
					{(recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0)} min
				</RecipeStat>
				<RecipeStat icon={<Users className='size-4' aria-hidden='true' />}>
					{recipe.servings} pers.
				</RecipeStat>
				<RecipeStat icon={<Gauge className='size-4' aria-hidden='true' />}>
					{difficultyLabels[recipe.difficulty]}
				</RecipeStat>
			</div>

			<button
				type='button'
				onClick={onToggle}
				aria-expanded={isOpen}
				aria-controls={detailsId}
				className='inline-flex cursor-pointer items-center gap-1 self-start rounded-sm text-sm font-medium text-accent-700 hover:underline'>
				{isOpen ? 'Masquer la recette' : 'Voir la recette'}
				<ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-180')} aria-hidden='true' />
			</button>
			{isOpen && <GeneratedRecipeDetails id={detailsId} recipe={recipe} />}

			<div className='mt-1 flex flex-wrap gap-2 border-t border-neutral-200 pt-3'>
				<Button disabled={isSaving} onClick={onSave} className='flex-1'>
					<BookmarkPlus aria-hidden='true' />
					Ajouter à mes recettes
				</Button>
				<Button variant='secondary' onClick={onDismiss}>
					<X aria-hidden='true' />
					Écarter
				</Button>
			</div>
		</article>
	);
}

function GeneratedRecipeDetails({ id, recipe }: { id: string; recipe: GeneratedRecipe }) {
	return (
		<div id={id} className='flex flex-col gap-4'>
			<div>
				<h4 className='text-sm font-medium text-neutral-900'>Ingrédients</h4>
				<ul className='mt-2 flex flex-wrap gap-2'>
					{recipe.ingredients.map((ingredient) => (
						<li
							key={`${ingredient.source}-${ingredient.name}`}
							className={cn(
								'rounded-full px-2.5 py-0.5 text-sm',
								ingredient.source === 'MISSING'
									? 'bg-warning-50 text-warning-700'
									: 'bg-neutral-100 text-neutral-800'
							)}>
							{ingredient.name}
							{ingredient.source === 'MISSING' ? ' · à acheter' : ''}
						</li>
					))}
				</ul>
			</div>
			<div>
				<h4 className='text-sm font-medium text-neutral-900'>Préparation</h4>
				<ol className='mt-2 flex list-decimal flex-col gap-2 pl-5 text-sm text-neutral-700 marker:font-semibold marker:text-accent-700'>
					{recipe.steps.map((step) => (
						<li key={step}>{step}</li>
					))}
				</ol>
			</div>
		</div>
	);
}
