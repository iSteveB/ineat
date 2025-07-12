// ===== IMPORTS SCHÉMAS ZOD =====
import {
	LoginCredentials,
	RegisterData,
	AuthResponse,
	User,
	AuthCheckResponse,
	validateSchema,
	LoginCredentialsSchema,
	RegisterDataSchema,
	AuthResponseSchema,
	UserSchema,
	AuthCheckResponseSchema,
} from '@/schemas';

// ===== IMPORTS UTILITAIRES =====
import { apiClient } from '../lib/api-client';

// ===== INTERFACE DU SERVICE D'AUTHENTIFICATION =====
interface AuthServiceMethods {
	login(credentials: LoginCredentials): Promise<AuthResponse>;
	register(data: RegisterData): Promise<AuthResponse>;
	getProfile(): Promise<User>;
	logout(): Promise<{ success: boolean; message: string }>;
	verifyAuthentication(): Promise<boolean>;
	checkAuthentication(): Promise<AuthCheckResponse>;
	loginWithGoogle(): void;
}

// ===== SERVICE D'AUTHENTIFICATION =====
export const authService: AuthServiceMethods = {
	/**
	 * Connexion avec email et mot de passe
	 */
	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		// Validation des données d'entrée
		const validation = validateSchema(LoginCredentialsSchema, credentials);
		if (!validation.success) {
			throw new Error(`Données de connexion invalides: ${validation.error}`);
		}

		try {
			const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
			
			// Validation de la réponse
			const responseValidation = validateSchema(AuthResponseSchema, response);
			if (!responseValidation.success) {
				console.warn('Réponse de connexion invalide:', responseValidation.error);
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
			throw new Error(`Données d'inscription invalides: ${validation.error}`);
		}

		try {
			const response = await apiClient.post<AuthResponse>('/auth/register', data);
			
			// Validation de la réponse
			const responseValidation = validateSchema(AuthResponseSchema, response);
			if (!responseValidation.success) {
				console.warn('Réponse d\'inscription invalide:', responseValidation.error);
			}

			return response;
		} catch (error) {
			console.error('Erreur lors de l\'inscription:', error);
			throw error;
		}
	},

	/**
	 * Récupération du profil utilisateur
	 */
	async getProfile(): Promise<User> {
		try {
			const response = await apiClient.get<User>('/auth/profile');
			
			// Validation de la réponse
			const validation = validateSchema(UserSchema, response);
			if (!validation.success) {
				console.warn('Données utilisateur invalides:', validation.error);
			}

			return response;
		} catch (error) {
			console.error('Erreur lors de la récupération du profil:', error);
			throw error;
		}
	},

	/**
	 * Déconnexion - supprime le cookie côté serveur
	 */
	async logout(): Promise<{ success: boolean; message: string }> {
		try {
			const response = await apiClient.post<{ success: boolean; message: string }>(
				'/auth/logout'
			);

			// Validation basique de la réponse
			if (typeof response.success !== 'boolean') {
				console.warn('Réponse de déconnexion invalide');
			}

			return response;
		} catch (error) {
			console.error('Erreur lors de la déconnexion:', error);
			throw error;
		}
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
			const response = await apiClient.get<AuthCheckResponse>('/auth/check');
			
			// Validation de la réponse
			const validation = validateSchema(AuthCheckResponseSchema, response);
			if (!validation.success) {
				console.warn('Réponse de vérification d\'authentification invalide:', validation.error);
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
			console.error('Erreur lors de la vérification d\'authentification:', error);
			// Retourner une réponse par défaut en cas d'erreur
			return {
				success: true,
				message: 'Erreur de vérification d\'authentification',
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
	loginWithGoogle(): void {
		const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
		window.location.href = `${apiUrl}/auth/google`;
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
export const extractUserFromAuthResponse = (response: AuthResponse): User | null => {
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
export const validateLoginCredentials = (credentials: unknown): credentials is LoginCredentials => {
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