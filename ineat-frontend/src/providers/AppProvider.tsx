import { lazy, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { queryClient } from '@/lib/query-client';

const QueryDevtools = import.meta.env.DEV
	? lazy(() =>
			import('@tanstack/react-query-devtools').then((module) => ({
				default: module.ReactQueryDevtools,
			}))
		)
	: null;

interface AppProviderProps {
	children: ReactNode;
}

/**
 * Composant Provider qui initialise les outils nécessaires pour l'application
 * - TanStack Query pour les requêtes
 * - Initialisation de l'authentification
 */
export function AppProvider({ children }: AppProviderProps) {
	const { isAuthenticated, getProfile } = useAuthStore();

	// Récupérer le profil de l'utilisateur au premier rendu si déjà authentifié
	useEffect(() => {
		if (isAuthenticated) {
			getProfile().catch(() => {
				// Erreur déjà gérée dans le store
			});
		}
	}, [isAuthenticated, getProfile]);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{QueryDevtools && (
				<Suspense fallback={null}>
					<QueryDevtools initialIsOpen={false} />
				</Suspense>
			)}
		</QueryClientProvider>
	);
}
