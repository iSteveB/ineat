import { createFileRoute } from '@tanstack/react-router';
import { RecipeDetailPage } from '@/pages/recipes/RecipeDetailPage';

export const Route = createFileRoute('/app/recipes/$recipeId')({
	component: RouteComponent,
});

function RouteComponent() {
	const { recipeId } = Route.useParams();
	return <RecipeDetailPage recipeId={recipeId} />;
}
