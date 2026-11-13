import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			retry: 1,
			refetchOnWindowFocus: false,
			gcTime: 1000 * 60 * 10,
		},
	},
});

export const invalidateInventoryQueries = () =>
	queryClient.invalidateQueries({ queryKey: ['inventory'] });
