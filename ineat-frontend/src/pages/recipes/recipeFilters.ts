import { z } from 'zod';

export const recipeFilterSchema = z
	.enum(['all', 'favorites', 'pending', 'done'])
	.catch('all');

export const recipeSearchSchema = z.object({
	filter: recipeFilterSchema.optional(),
});

export type RecipeFilter = z.infer<typeof recipeFilterSchema>;
