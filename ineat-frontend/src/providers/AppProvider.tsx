import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';

interface AppProviderProps {
	children: ReactNode;
}

// Configuration du client de requête avec des options par défaut
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Considérer les données comme "fraîches" pendant 5 minutes
			staleTime: 1000 * 60 * 5,

			// Réessayer les requêtes échouées une seule fois
			retry: 1,

			// Ne pas rafraîchir automatiquement lors de la reprise de focus
			refetchOnWindowFocus: false,

			// Conserver les données en cache pendant 10 minutes
			gcTime: 1000 * 60 * 10,
		},
	},
});

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
			{import.meta.env.DEV && (
				<ReactQueryDevtools initialIsOpen={false} />
			)}
		</QueryClientProvider>
	);
}
