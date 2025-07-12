import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@/schemas';

/**
 * Vérifie si l'utilisateur est authentifié, d'abord localement puis auprès du serveur si nécessaire
 * @returns Promise<boolean> true si l'utilisateur est authentifié
 */

export const isAuthenticated = async (): Promise<boolean> => {
	// Vérifier d'abord le store local
	const { isAuthenticated: storeAuthenticated, user } =
		useAuthStore.getState();

	if (storeAuthenticated && user) {
		return true;
	}

	// Si pas authentifié localement, vérifier auprès du serveur
	try {
		const user = await apiClient.get<User>('/auth/profile');

		// Si la requête réussit, l'utilisateur est authentifié
		// Mettre à jour le store
		useAuthStore.setState({
			user,
			isAuthenticated: true,
		});

		return true;
	} catch {
		// Si la requête échoue, l'utilisateur n'est pas authentifié
		return false;
	}
};

/**
 * Fonction opposée, vérifie si l'utilisateur n'est pas authentifié
 * @returns Promise<boolean> true si l'utilisateur n'est pas authentifié
 */
export const isUnauthenticated = async (): Promise<boolean> => {
	return !(await isAuthenticated());
};
