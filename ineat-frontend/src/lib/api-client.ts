export class ApiRequestError extends Error {
	status: number;
	code?: string;
	requestId?: string;
	rawMessage?: string;

	constructor(
		message: string,
		status: number,
		options: {
			code?: string;
			requestId?: string;
			rawMessage?: string;
		} = {}
	) {
		super(message);
		this.name = 'ApiRequestError';
		this.status = status;
		this.code = options.code;
		this.requestId = options.requestId;
		this.rawMessage = options.rawMessage;
	}
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(
	/\/$/,
	''
);
const DEFAULT_ERROR_MESSAGE = 'Une erreur est survenue. Veuillez réessayer.';
const NETWORK_ERROR_MESSAGE =
	'Impossible de joindre le serveur. Vérifiez votre connexion.';

interface FetchOptions extends RequestInit {
	skipAuth?: boolean;
	timeoutMs?: number;
}

interface ApiErrorResponse {
	code?: string;
	message?: string | string[];
	requestId?: string;
}

const SENSITIVE_ERROR_PATTERNS = [
	/api[_ -]?key/i,
	/api[_ -]?secret/i,
	/secret/i,
	/token/i,
	/password/i,
	/invalid signature/i,
	/signature/i,
	/cloudinary/i,
	/CLOUDINARY_/i,
	/stack/i,
	/prisma/i,
	/postgres/i,
	/redis/i,
	/trace/i,
	/exception/i,
];

const PUBLIC_ERROR_MESSAGES_BY_CODE: Record<string, string> = {};
const DEFAULT_TIMEOUT_MS = 30000;

const getResponseHeader = (response: Response, name: string): string | null => {
	if (!response.headers || typeof response.headers.get !== 'function') {
		return null;
	}

	return response.headers.get(name);
};

const getApiErrorMessage = (errorData: ApiErrorResponse | null) => {
	if (!errorData) {
		return undefined;
	}

	if (typeof errorData.message === 'string') {
		return errorData.message;
	}

	if (Array.isArray(errorData.message)) {
		return errorData.message.join(', ');
	}

	return undefined;
};

const containsSensitiveDetails = (message?: string): boolean => {
	if (!message) {
		return false;
	}

	return SENSITIVE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

const getEndpointFallbackMessage = (
	endpoint: string,
	status: number
): string => {
	if (status === 401) {
		return 'Votre session a expiré. Veuillez vous reconnecter.';
	}

	if (status === 403) {
		return "Vous n'avez pas les droits nécessaires pour effectuer cette action.";
	}

	if (endpoint.includes('/auth/')) {
		return "Impossible de finaliser l'authentification. Veuillez réessayer.";
	}

	if (endpoint.includes('/avatar')) {
		return 'Impossible de mettre à jour la photo de profil. Veuillez réessayer.';
	}

	if (endpoint.includes('/inventory')) {
		return "Impossible de mettre à jour l'inventaire. Veuillez réessayer.";
	}

	if (endpoint.includes('/budget') || endpoint.includes('/expense')) {
		return 'Impossible de mettre à jour le budget. Veuillez réessayer.';
	}

	return DEFAULT_ERROR_MESSAGE;
};

const getPublicErrorMessage = (
	endpoint: string,
	status: number,
	errorData: ApiErrorResponse | null,
	rawMessage?: string
): string => {
	if (status === 403 && /premium|abonnement/i.test(rawMessage || '')) {
		return 'Cette action nécessite Premium.';
	}

	if (errorData?.code && PUBLIC_ERROR_MESSAGES_BY_CODE[errorData.code]) {
		return PUBLIC_ERROR_MESSAGES_BY_CODE[errorData.code];
	}

	if (status >= 500 || containsSensitiveDetails(rawMessage)) {
		return getEndpointFallbackMessage(endpoint, status);
	}

	return rawMessage || getEndpointFallbackMessage(endpoint, status);
};

// Client API principal
export const apiClient = {
	// Méthode principale pour effectuer des requêtes
	async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const {
			skipAuth = false,
			timeoutMs = DEFAULT_TIMEOUT_MS,
			...fetchOptions
		} = options;

		const isFormData = fetchOptions.body instanceof FormData;

		// Préparation des en-têtes
		const headers = new Headers(fetchOptions.headers);
		if (!isFormData) {
			headers.set('Content-Type', 'application/json');
		}
		headers.set('Accept', 'application/json');

		// Construction de l'URL complète
		const url = `${API_URL}${
			endpoint.startsWith('/') ? endpoint : `/${endpoint}`
		}`;

		// Création du contrôleur d'annulation pour gérer les timeouts
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
			// Exécution de la requête
			const response = await fetch(url, {
				...fetchOptions,
				headers,
				signal: controller.signal,
				credentials: 'include', // Ajoute les cookies aux requêtes
			});

			// Gestion de base des erreurs HTTP
			if (!response.ok) {
				let errorData: ApiErrorResponse | null = null;

				// Tentative de récupération du message d'erreur
				try {
					errorData = await response.json();
				} catch {
					// Si on ne peut pas parser le JSON, on utilise le message par défaut
				}

				const rawMessage = getApiErrorMessage(errorData);
				const requestId =
					errorData?.requestId ||
					getResponseHeader(response, 'X-Request-Id') ||
					undefined;
				const errorMessage = getPublicErrorMessage(
					endpoint,
					response.status,
					errorData,
					rawMessage
				);

				throw new ApiRequestError(errorMessage, response.status, {
					code: errorData?.code,
					requestId,
					rawMessage,
				});
			}

			// Si la réponse est vide (204 No Content), on retourne null
			if (response.status === 204) {
				return null as T;
			}

			// Parsing du JSON de la réponse
			const data = await response.json();
			return data as T;
		} catch (error) {
			// Gestion des erreurs réseau et des timeouts
			if (error instanceof ApiRequestError) {
				throw error;
			}

			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new ApiRequestError('La requête a expiré', 408);
				}
				throw new ApiRequestError(NETWORK_ERROR_MESSAGE, 0, {
					rawMessage: error.message,
				});
			}

			throw new ApiRequestError(NETWORK_ERROR_MESSAGE, 0);
		} finally {
			clearTimeout(timeoutId);
		}
	},

	// Méthodes d'aide pour les différents types de requêtes HTTP

	// GET
	get<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
		return this.fetch<T>(endpoint, { ...options, method: 'GET' });
	},

	// POST
	post<T>(
		endpoint: string,
		data?: unknown,
		options: FetchOptions = {}
	): Promise<T> {
		return this.fetch<T>(endpoint, {
			...options,
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined,
		});
	},

	// PUT
	put<T>(
		endpoint: string,
		data?: unknown,
		options: FetchOptions = {}
	): Promise<T> {
		return this.fetch<T>(endpoint, {
			...options,
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined,
		});
	},

	// PATCH
	patch<T>(
		endpoint: string,
		data?: unknown,
		options: FetchOptions = {}
	): Promise<T> {
		return this.fetch<T>(endpoint, {
			...options,
			method: 'PATCH',
			body: data ? JSON.stringify(data) : undefined,
		});
	},

	// DELETE
	delete<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
		return this.fetch<T>(endpoint, { ...options, method: 'DELETE' });
	},
};
