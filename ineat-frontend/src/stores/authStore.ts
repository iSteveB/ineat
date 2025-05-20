import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials, RegisterData } from '../types/user';
import { authService } from '../services/authService';

interface AuthState {
	// État
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;

	// Actions
	login: (credentials: LoginCredentials) => Promise<void>;
	register: (data: RegisterData) => Promise<void>;
	logout: () => Promise<void>;
	getProfile: () => Promise<void>;
	verifyAuthentication: () => Promise<boolean>;
	loginWithGoogle: () => void;
	handleOAuthCallback: (token: string) => void;
	setError: (error: string | null) => void;
	setUser: (user: User) => void;
	clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			// État initial
			user: null,
			isAuthenticated: false,
			isLoading: false,
			error: null,

			// Actions
			login: async (credentials: LoginCredentials) => {
				try {
					set({ isLoading: true, error: null });

					const response = await authService.login(credentials);

					set({
						user: response.user,
						isAuthenticated: true,
						isLoading: false,
					});
				} catch (error) {
					set({
						isLoading: false,
						error:
							error instanceof Error
								? error.message
								: 'Une erreur est survenue lors de la connexion',
					});
					throw error;
				}
			},

			register: async (data: RegisterData) => {
				try {
					set({ isLoading: true, error: null });

					const response = await authService.register(data);

					set({
						user: response.user,
						isAuthenticated: true,
						isLoading: false,
					});
				} catch (error) {
					set({
						isLoading: false,
						error:
							error instanceof Error
								? error.message
								: "Une erreur est survenue lors de l'inscription",
					});
					throw error;
				}
			},

			logout: async () => {
				try {
					set({ isLoading: true });

					await authService.logout();

					set({
						user: null,
						isAuthenticated: false,
						isLoading: false,
					});
				} catch (error) {
					// Même en cas d'erreur, l'utilisateur est déconnecté localement
					set({
						user: null,
						isAuthenticated: false,
						isLoading: false,
						error:
							error instanceof Error
								? error.message
								: 'Une erreur est survenue lors de la déconnexion',
					});
					throw error;
				}
			},

			getProfile: async () => {
				try {
					set({ isLoading: true, error: null });

					const user = await authService.getProfile();

					set({
						user,
						isAuthenticated: true,
						isLoading: false,
					});
				} catch (error) {
					set({
						isLoading: false,
						error:
							error instanceof Error
								? error.message
								: 'Une erreur est survenue lors de la récupération du profil',
					});
					throw error;
				}
			},

			verifyAuthentication: async () => {
				try {
					// Vérification simple: Pas d'utilisateur dans le state = pas besoin d'aller plus loin
					if (!get().user) {
						return false;
					}

					const isValid = await authService.verifyAuthentication();

					// Si la vérification échoue, effacer l'utilisateur
					if (!isValid) {
						set({
							user: null,
							isAuthenticated: false,
						});
					}

					return isValid;
				} catch (error) {
					// En cas d'erreur, considérer l'utilisateur comme non authentifié
					set({
						user: null,
						isAuthenticated: false,
						error:
							error instanceof Error
								? error.message
								: "Erreur de vérification d'authentification",
					});
					return false;
				}
			},

			loginWithGoogle: () => {
				authService.loginWithGoogle();
			},

			// Traiter le callback OAuth
			handleOAuthCallback: () => {
				// Le token est déjà géré côté serveur
				// Cette méthode sert la compatibilité avec le composant OAuthCallback
				set({
					isLoading: true,
					error: null,
				});
				// Pas besoin de stocker le token ici, il est déjà stocké côté serveur
			},

			setError: (error: string | null) => set({ error }),

			setUser: (user: User) =>
				set({
					user,
					isAuthenticated: true,
				}),

			clearUser: () => set({ user: null, isAuthenticated: false }),
		}),
		{
			name: 'ineat-auth-store',
			// Ne persister que l'utilisateur, pas l'état complet
			partialize: (state) => ({ user: state.user }),
		}
	)
);
