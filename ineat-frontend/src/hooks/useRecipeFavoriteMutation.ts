import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { recipeService, SavedRecipe } from '@/services/recipeService';
import { getUserFacingErrorMessage } from '@/utils/errorMessages';

type FavoriteMutationVariables = {
	recipeId: string;
	isFavorite: boolean;
};

type FavoriteMutationContext = {
	previousList?: SavedRecipe[];
	previousDetail?: SavedRecipe;
};

export function useRecipeFavoriteMutation() {
	const queryClient = useQueryClient();

	return useMutation<
		SavedRecipe,
		Error,
		FavoriteMutationVariables,
		FavoriteMutationContext
	>({
		mutationFn: ({ recipeId, isFavorite }) =>
			recipeService.updateFavorite(recipeId, isFavorite),
		onMutate: async ({ recipeId, isFavorite }) => {
			await Promise.all([
				queryClient.cancelQueries({ queryKey: ['recipes', 'saved'] }),
				queryClient.cancelQueries({
					queryKey: ['recipes', 'saved', recipeId],
				}),
			]);

			const previousList = queryClient.getQueryData<SavedRecipe[]>([
				'recipes',
				'saved',
			]);
			const previousDetail = queryClient.getQueryData<SavedRecipe>([
				'recipes',
				'saved',
				recipeId,
			]);

			queryClient.setQueryData<SavedRecipe[]>(
				['recipes', 'saved'],
				(current) =>
					current?.map((recipe) =>
						recipe.id === recipeId ? { ...recipe, isFavorite } : recipe
					)
			);
			queryClient.setQueryData<SavedRecipe>(
				['recipes', 'saved', recipeId],
				(current) => (current ? { ...current, isFavorite } : current)
			);

			return { previousList, previousDetail };
		},
		onSuccess: (recipe) => {
			queryClient.setQueryData<SavedRecipe[]>(
				['recipes', 'saved'],
				(current) =>
					current?.map((item) => (item.id === recipe.id ? recipe : item))
			);
			queryClient.setQueryData(
				['recipes', 'saved', recipe.id],
				recipe
			);
			toast.success(
				recipe.isFavorite ? 'Ajoutée aux favoris' : 'Retirée des favoris'
			);
		},
		onError: (error, { recipeId }, context) => {
			if (context?.previousList) {
				queryClient.setQueryData(
					['recipes', 'saved'],
					context.previousList
				);
			}
			if (context?.previousDetail) {
				queryClient.setQueryData(
					['recipes', 'saved', recipeId],
					context.previousDetail
				);
			}
			toast.error('Favori non modifié', {
				description: getUserFacingErrorMessage(
					error,
					'Impossible de modifier cette recette.'
				),
			});
		},
	});
}
