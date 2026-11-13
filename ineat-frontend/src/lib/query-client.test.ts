import { describe, expect, it } from 'vitest';

import { invalidateInventoryQueries, queryClient } from './query-client';

describe('invalidateInventoryQueries', () => {
	it('invalide tous les caches du tableau de bord liés à l’inventaire', async () => {
		queryClient.setQueryData(['inventory', 'stats'], { totalQuantity: 4 });
		queryClient.setQueryData(['inventory', 'recent', 5], [{ id: 'item-1' }]);
		queryClient.setQueryData(['budget', 'current'], { total: 10 });

		await invalidateInventoryQueries();

		expect(
			queryClient.getQueryState(['inventory', 'stats'])?.isInvalidated,
		).toBe(true);
		expect(
			queryClient.getQueryState(['inventory', 'recent', 5])?.isInvalidated,
		).toBe(true);
		expect(
			queryClient.getQueryState(['budget', 'current'])?.isInvalidated,
		).toBe(false);

		queryClient.clear();
	});
});
