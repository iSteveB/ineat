import { createFileRoute } from '@tanstack/react-router';
import { RecipeDetailPage } from '@/pages/recipes/RecipeDetailPage';
import { recipeSearchSchema } from '@/pages/recipes/recipeFilters';

export const Route = createFileRoute('/app/recipes/$recipeId')({
	component: RouteComponent,
	validateSearch: recipeSearchSchema,
});

function RouteComponent() {
	const { recipeId } = Route.useParams();
	return <RecipeDetailPage recipeId={recipeId} />;
}
