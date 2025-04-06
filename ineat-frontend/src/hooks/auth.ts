import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { authService } from '@/services/authService';

// Clés de cache pour les requêtes d'authentification
export const authKeys = {
	user: ['auth', 'user'] as const,
};

// Hook optimisé pour récupérer le profil utilisateur en utilisant TanStack Query et Zustand
export function useUser() {
	const { isAuthenticated, user: storeUser, setUser } = useAuthStore();

	return useQuery({
		queryKey: authKeys.user,
		queryFn: async () => {
			const user = await authService.getProfile();
			// Mettre à jour le store Zustand avec les données fraîches
			setUser(user);
			return user;
		},
		initialData: () => storeUser || undefined,
		// Activer la requête seulement si l'utilisateur est authentifié
		enabled: isAuthenticated && !storeUser,
		staleTime: 1000 * 60 * 5, // 5 minutes avant de considérer les données comme obsolètes
		gcTime: 1000 * 60 * 10, // 10 minutes avant de garbage collecter la requête
	});
}

// Hook pour rafraîchir les données utilisateur
export function useRefreshUser() {
	const queryClient = useQueryClient();

	return () => {
		return queryClient.invalidateQueries({ queryKey: authKeys.user });
	};
}

// Hook pour précharger les données utilisateur
export function usePrefetchUser() {
	const queryClient = useQueryClient();
	const { isAuthenticated } = useAuthStore();

	return () => {
		if (isAuthenticated) {
			return queryClient.prefetchQuery({
				queryKey: authKeys.user,
				queryFn: authService.getProfile,
			});
		}
		return Promise.resolve();
	};
}

// Hook pour déterminer si l'utilisateur a un rôle spécifique
export function useHasRole(role: string): boolean {
	const { user } = useAuthStore();

	return Boolean(user?.role?.includes(role));
}
