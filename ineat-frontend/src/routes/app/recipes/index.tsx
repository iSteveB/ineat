import { createFileRoute } from '@tanstack/react-router';
import { RecipeSuggestionsPage } from '@/pages/recipes/RecipeSuggestionsPage';

export const Route = createFileRoute('/app/recipes/')({
	component: RecipeSuggestionsPage,
});
