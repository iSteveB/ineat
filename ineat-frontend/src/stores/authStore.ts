import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ===== IMPORTS SCHÉMAS ZOD =====
import {
	User,
	LoginCredentials,
	RegisterData,
	AuthResponse
} from '@/schemas';

// ===== IMPORTS SERVICES =====
import {
	authService,
	isValidUser,
	extractUserFromAuthResponse,
} from '../services/authService';

// ===== INTERFACE DU STORE D'AUTHENTIFICATION =====
interface AuthState {
	// ===== ÉTAT =====
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;

	// ===== ACTIONS =====
	login: (credentials: LoginCredentials) => Promise<void>;
	register: (data: RegisterData) => Promise<void>;
	logout: () => Promise<void>;
	getProfile: () => Promise<void>;
	verifyAuthentication: () => Promise<boolean>;
	checkAuthentication: () => Promise<boolean>;
	loginWithGoogle: () => void;
	handleOAuthCallback: (token?: string) => Promise<void>;
	setError: (error: string | null) => void;
	setUser: (user: User) => void;
	clearUser: () => void;

	// ===== UTILITAIRES =====
	isUserPremium: () => boolean;
	isUserAdmin: () => boolean;
}

// ===== CRÉATION DU STORE =====
export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			// ===== ÉTAT INITIAL =====
			user: null,
			isAuthenticated: false,
			isLoading: false,
			error: null,

			// ===== ACTIONS D'AUTHENTIFICATION =====

			/**
			 * Connexion avec email et mot de passe
			 */
			login: async (credentials: LoginCredentials) => {
				try {
					set({ isLoading: true, error: null });

					const response: AuthResponse = await authService.login(
						credentials
					);

					// Extraction et validation de l'utilisateur
					const user = extractUserFromAuthResponse(response);

					if (!user) {
						throw new Error('Réponse de connexion invalide');
					}

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
								: 'Une erreur est survenue lors de la connexion',
					});
					throw error;
				}
			},

			/**
			 * Inscription d'un nouvel utilisateur
			 */
			register: async (data: RegisterData) => {
				try {
					set({ isLoading: true, error: null });

					const response: AuthResponse = await authService.register(
						data
					);

					// Extraction et validation de l'utilisateur
					const user = extractUserFromAuthResponse(response);

					if (!user) {
						throw new Error("Réponse d'inscription invalide");
					}

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
								: "Une erreur est survenue lors de l'inscription",
					});
					throw error;
				}
			},

			/**
			 * Déconnexion de l'utilisateur
			 */
			logout: async () => {
				try {
					set({ isLoading: true, error: null });

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

			/**
			 * Récupération du profil utilisateur
			 */
			getProfile: async () => {
				try {
					set({ isLoading: true, error: null });

					const user: User = await authService.getProfile();

					// Validation du profil reçu
					if (!isValidUser(user)) {
						throw new Error('Profil utilisateur invalide');
					}

					set({
						user,
						isAuthenticated: true,
						isLoading: false,
					});
				} catch (error) {
					set({
						user: null,
						isAuthenticated: false,
						isLoading: false,
						error:
							error instanceof Error
								? error.message
								: 'Une erreur est survenue lors de la récupération du profil',
					});
					throw error;
				}
			},

			/**
			 * Vérification simple de l'authentification (méthode rapide)
			 * @deprecated Utilisez checkAuthentication() pour une vérification complète
			 */
			verifyAuthentication: async () => {
				try {
					// Vérification simple: Pas d'utilisateur dans le state = pas besoin d'aller plus loin
					const currentUser = get().user;
					if (!currentUser) {
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

			/**
			 * Vérification complète de l'authentification (nouvelle méthode)
			 */
			checkAuthentication: async () => {
				try {
					const response = await authService.checkAuthentication();

					if (
						response.success &&
						response.data.isAuthenticated &&
						response.data.user
					) {
						// Validation de l'utilisateur reçu
						if (isValidUser(response.data.user)) {
							set({
								user: response.data.user,
								isAuthenticated: true,
								error: null,
							});
							return true;
						}
					}

					// Utilisateur non authentifié ou données invalides
					set({
						user: null,
						isAuthenticated: false,
					});
					return false;
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

			/**
			 * Redirection vers l'authentification Google
			 */
			loginWithGoogle: () => {
				authService.loginWithGoogle();
			},

			/**
			 * Traitement du callback OAuth
			 */
			handleOAuthCallback: async () => {
				try {
					set({
						isLoading: true,
						error: null,
					});

					// Récupérer le profil après l'authentification OAuth
					await get().getProfile();
				} catch (error) {
					set({
						isLoading: false,
						error:
							error instanceof Error
								? error.message
								: 'Erreur lors du traitement du callback OAuth',
					});
					throw error;
				}
			},

			// ===== ACTIONS UTILITAIRES =====

			/**
			 * Définit une erreur
			 */
			setError: (error: string | null) => set({ error }),

			/**
			 * Définit l'utilisateur et marque comme authentifié
			 */
			setUser: (user: User) => {
				// Validation avant de sauvegarder
				if (isValidUser(user)) {
					set({
						user,
						isAuthenticated: true,
						error: null,
					});
				} else {
					console.error(
						"Tentative de définition d'un utilisateur invalide"
					);
					set({
						error: 'Données utilisateur invalides',
					});
				}
			},

			/**
			 * Efface l'utilisateur et marque comme non authentifié
			 */
			clearUser: () =>
				set({
					user: null,
					isAuthenticated: false,
					error: null,
				}),

			// ===== GETTERS UTILITAIRES =====

			/**
			 * Vérifie si l'utilisateur a un abonnement premium
			 */
			isUserPremium: () => {
				const user = get().user;
				return (
					user?.subscription === 'PREMIUM' ||
					user?.subscription === 'ADMIN'
				);
			},

			/**
			 * Vérifie si l'utilisateur est administrateur
			 */
			isUserAdmin: () => {
				const user = get().user;
				return user?.subscription === 'ADMIN';
			},
		}),
		{
			name: 'ineat-auth-store',
			// Ne persister que l'utilisateur, pas l'état complet
			partialize: (state) => ({
				user: state.user,
			}),

			// Fonction de migration pour gérer les changements de schéma
			migrate: (persistedState: unknown) => {
				if (
					typeof persistedState === 'object' &&
					persistedState !== null
				) {
					const state = persistedState as Record<string, unknown>;

					// Valider l'utilisateur persisté
					if (state.user && !isValidUser(state.user)) {
						console.warn(
							'Utilisateur persisté invalide, suppression...'
						);
						return {
							user: null,
						};
					}
				}

				return persistedState as { user: User | null };
			},

			version: 1, // Version du schéma de persistance
		}
	)
);

// ===== HOOKS ET UTILITAIRES EXPORTÉS =====

/**
 * Hook pour obtenir l'utilisateur actuel
 */
export const useCurrentUser = () => useAuthStore((state) => state.user);

/**
 * Hook pour vérifier si l'utilisateur est authentifié
 */
export const useIsAuthenticated = () =>
	useAuthStore((state) => state.isAuthenticated);

/**
 * Hook pour vérifier si l'utilisateur est premium
 */
export const useIsPremium = () =>
	useAuthStore((state) => state.isUserPremium());

/**
 * Hook pour vérifier si l'utilisateur est admin
 */
export const useIsAdmin = () => useAuthStore((state) => state.isUserAdmin());

/**
 * Hook pour obtenir l'état de chargement de l'authentification
 */
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);

/**
 * Hook pour obtenir les erreurs d'authentification
 */
export const useAuthError = () => useAuthStore((state) => state.error);

/**
 * Fonction utilitaire pour obtenir l'état actuel du store
 */
export const getAuthState = () => useAuthStore.getState();
