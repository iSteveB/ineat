// ===== IMPORTS SCHÉMAS ZOD =====
import {
	LoginCredentials,
	RegisterData,
	AuthResponse,
	User,
	AuthCheckResponse,
	ApiSuccessResponse,
	validateSchema,
	LoginCredentialsSchema,
	RegisterDataSchema,
	AuthResponseSchema,
	UserSchema,
	AuthCheckResponseSchema,
} from '@/schemas';

// ===== IMPORTS UTILITAIRES =====
import { apiClient } from '../lib/api-client';
import { authClient } from '../lib/auth-client';

// ===== INTERFACE DU SERVICE D'AUTHENTIFICATION =====
interface AuthServiceMethods {
	login(credentials: LoginCredentials): Promise<AuthResponse>;
	register(data: RegisterData): Promise<AuthResponse>;
	getProfile(): Promise<User>;
	logout(): Promise<{ success: boolean; message: string }>;
	verifyAuthentication(): Promise<boolean>;
	checkAuthentication(): Promise<AuthCheckResponse>;
	loginWithGoogle(): Promise<void>;
}

const toAuthResponse = (user: User): AuthResponse => ({
	success: true,
	data: {
		user,
	},
});

export const normalizeAuthEmail = (email: string) =>
	email.trim().toLowerCase();

export const getBetterAuthErrorMessage = (
	error: { message?: string; code?: string } | null | undefined,
	fallback: string,
	publicMessages: Record<string, string> = {}
) => (error?.code ? publicMessages[error.code] : undefined) || fallback;

// ===== SERVICE D'AUTHENTIFICATION =====
export const authService: AuthServiceMethods = {
	/**
	 * Connexion avec email et mot de passe
	 */
	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		// Validation des données d'entrée
		const validation = validateSchema(LoginCredentialsSchema, credentials);
		if (!validation.success) {
			throw new Error(
				`Données de connexion invalides: ${validation.error}`
			);
		}

		try {
			const { error } = await authClient.signIn.email({
				email: normalizeAuthEmail(credentials.email),
				password: credentials.password,
				rememberMe: true,
			});

			if (error) {
				throw new Error(
					getBetterAuthErrorMessage(
						error,
						'Connexion impossible. Veuillez réessayer.',
						{
							INVALID_EMAIL_OR_PASSWORD:
								'Identifiants incorrects',
						}
					)
				);
			}

			const user = await authService.getProfile();
			const response = toAuthResponse(user);
			const responseValidation = validateSchema(
				AuthResponseSchema,
				response
			);

			if (!responseValidation.success) {
				console.warn(
					'Réponse de connexion invalide:',
					responseValidation.error
				);
			}

			return response;
		} catch (error) {
			console.error('Erreur lors de la connexion:', error);
			throw error;
		}
	},

	/**
	 * Inscription d'un nouvel utilisateur
	 */
	async register(data: RegisterData): Promise<AuthResponse> {
		// Validation des données d'entrée
		const validation = validateSchema(RegisterDataSchema, data);
		if (!validation.success) {
			throw new Error(
				`Données d'inscription invalides: ${validation.error}`
			);
		}

		try {
			const signUpPayload = {
				email: normalizeAuthEmail(data.email),
				password: data.password,
				name: `${data.firstName} ${data.lastName}`.trim(),
				firstName: data.firstName,
				lastName: data.lastName,
				profileType: data.profileType,
			};
			const { error } = await authClient.signUp.email(
				signUpPayload as Parameters<typeof authClient.signUp.email>[0]
			);

			if (error) {
				throw new Error(
					getBetterAuthErrorMessage(
						error,
						"Impossible de finaliser l'inscription",
						{
							USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
								'Un compte existe déjà avec cette adresse. Connectez-vous.',
						}
					)
				);
			}

			const user = await authService.getProfile();
			const response = toAuthResponse(user);
			const responseValidation = validateSchema(
				AuthResponseSchema,
				response
			);

			if (!responseValidation.success) {
				console.warn(
					"Réponse d'inscription invalide:",
					responseValidation.error
				);
			}

			return response;
		} catch (error) {
			console.error("Erreur lors de l'inscription:", error);
			throw error;
		}
	},

	/**
	 * Récupération du profil utilisateur
	 */
	async getProfile(): Promise<User> {
		try {
			// Le backend retourne maintenant une structure { success: true, data: User }
			const response = await apiClient.get<ApiSuccessResponse<User>>(
				'/auth/profile'
			);

			// Validation de la réponse
			const validation = validateSchema(UserSchema, response.data);
			if (!validation.success) {
				console.warn(
					'Données utilisateur invalides:',
					validation.error
				);
				console.warn('Données reçues:', response.data);
			}

			return response.data;
		} catch (error) {
			console.error('Erreur lors de la récupération du profil:', error);
			throw error;
		}
	},

	/**
	 * Déconnexion - supprime le cookie côté serveur
	 */
	async logout(): Promise<{ success: boolean; message: string }> {
		const { error } = await authClient.signOut();
		if (error) {
			console.error('Déconnexion Better Auth incomplète:', error);
			throw new Error('Impossible de révoquer la session');
		}

		return {
			success: true,
			message: 'Déconnexion réussie',
		};
	},

	/**
	 * Vérifie l'authentification auprès du serveur (méthode simple)
	 * @deprecated Utilisez checkAuthentication() pour une réponse plus détaillée
	 */
	async verifyAuthentication(): Promise<boolean> {
		try {
			await apiClient.get('/auth/check');
			return true;
		} catch {
			return false;
		}
	},

	/**
	 * Vérifie l'authentification auprès du serveur avec réponse détaillée
	 */
	async checkAuthentication(): Promise<AuthCheckResponse> {
		try {
			const response = await apiClient.get<AuthCheckResponse>(
				'/auth/check'
			);

			// Validation de la réponse
			const validation = validateSchema(
				AuthCheckResponseSchema,
				response
			);
			if (!validation.success) {
				console.warn(
					"Réponse de vérification d'authentification invalide:",
					validation.error
				);
				console.warn('Réponse reçue:', response);
				// Retourner une réponse par défaut en cas d'erreur de validation
				return {
					success: true,
					data: {
						isAuthenticated: false,
						user: undefined,
					},
				};
			}

			return response;
		} catch (error) {
			console.error(
				"Erreur lors de la vérification d'authentification:",
				error
			);
			// Retourner une réponse par défaut en cas d'erreur
			return {
				success: true,
				message: "Erreur de vérification d'authentification",
				data: {
					isAuthenticated: false,
					user: undefined,
				},
			};
		}
	},

	/**
	 * Redirection vers l'authentification Google
	 */
	async loginWithGoogle(): Promise<void> {
		const callbackURL = `${window.location.origin}/auth/callback`;
		const { data, error } = await authClient.signIn.social({
			provider: 'google',
			callbackURL,
		});

		if (error) {
			throw new Error(
				getBetterAuthErrorMessage(
					error,
					'Impossible de démarrer la connexion Google'
				)
			);
		}

		if (data?.url) {
			window.location.href = data.url;
			return;
		}
	},
};

// ===== UTILITAIRES D'AUTHENTIFICATION =====

/**
 * Vérifie si un utilisateur est valide
 */
export const isValidUser = (user: unknown): user is User => {
	const validation = validateSchema(UserSchema, user);
	return validation.success;
};

/**
 * Extrait les données utilisateur d'une réponse d'authentification
 */
export const extractUserFromAuthResponse = (
	response: AuthResponse
): User | null => {
	try {
		if (response.success && response.data.user) {
			return isValidUser(response.data.user) ? response.data.user : null;
		}
		return null;
	} catch {
		return null;
	}
};

/**
 * Vérifie si les credentials de connexion sont valides
 */
export const validateLoginCredentials = (
	credentials: unknown
): credentials is LoginCredentials => {
	const validation = validateSchema(LoginCredentialsSchema, credentials);
	return validation.success;
};

/**
 * Vérifie si les données d'inscription sont valides
 */
export const validateRegisterData = (data: unknown): data is RegisterData => {
	const validation = validateSchema(RegisterDataSchema, data);
	return validation.success;
};

// ===== EXPORT PAR DÉFAUT =====
export default authService;
