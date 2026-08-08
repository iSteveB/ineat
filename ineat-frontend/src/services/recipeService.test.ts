import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { recipeService } from './recipeService';
import { server } from '@/test/mocks/server';

const API_URL = import.meta.env.VITE_API_URL;

describe('recipeService', () => {
	it('envoie un PATCH idempotent pour modifier le favori', async () => {
		let requestBody: unknown;

		server.use(
			http.patch(`${API_URL}/recipes/recipe-1/favorite`, async ({ request }) => {
				requestBody = await request.json();
				return HttpResponse.json({
					success: true,
					data: {
						id: 'recipe-1',
						name: 'Houmous citronné',
						isFavorite: true,
					},
				});
			})
		);

		const result = await recipeService.updateFavorite('recipe-1', true);

		expect(requestBody).toEqual({ isFavorite: true });
		expect(result).toMatchObject({
			id: 'recipe-1',
			isFavorite: true,
		});
	});
});
