import {
	LoginCredentials,
	RegisterData,
	AuthResponse,
	User,
} from '../types/auth';
import { apiClient } from '../lib/api-client';

// Service gérant les opérations d'authentification
export const authService = {
	// Connexion avec email et mot de passe
	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		return apiClient.post<AuthResponse>('/auth/login', credentials);
	},

	// Inscription d'un nouvel utilisateur
	async register(data: RegisterData): Promise<AuthResponse> {
		return apiClient.post<AuthResponse>('/auth/register', data);
	},

	// Récupération du profil utilisateur
	async getProfile(): Promise<User> {
		return apiClient.get<User>('/auth/profile');
	},

	// Déconnexion - supprime le cookie côté serveur
	async logout(): Promise<{ success: boolean; message: string }> {
		return apiClient.post<{ success: boolean; message: string }>(
			'/auth/logout'
		);
	},

	// Vérifie l'authentification auprès du serveur
	async verifyAuthentication(): Promise<boolean> {
		try {
			await apiClient.get('/auth/check');
			return true;
		} catch  {
			return false;
		}
	},

	// Redirection vers l'authentification Google
	loginWithGoogle(): void {
		const apiUrl =
			import.meta.env.VITE_API_URL || 'https://localhost:3000/api';
		window.location.href = `${apiUrl}/auth/google`;
	},
};
