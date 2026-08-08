import { createFileRoute } from '@tanstack/react-router';
import { RecipeSuggestionsPage } from '@/pages/recipes/RecipeSuggestionsPage';
import { recipeSearchSchema } from '@/pages/recipes/recipeFilters';

export const Route = createFileRoute('/app/recipes/suggestions')({
	component: RecipeSuggestionsPage,
	validateSearch: recipeSearchSchema,
});
