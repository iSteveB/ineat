export class ApiRequestError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'ApiRequestError';
		this.status = status;
	}
}

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3000/api';

interface FetchOptions extends RequestInit {
	skipAuth?: boolean;
}

// Client API principal
export const apiClient = {
	// Méthode principale pour effectuer des requêtes
	async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { skipAuth = false, ...fetchOptions } = options;

		// Préparation des en-têtes
		const headers = new Headers(fetchOptions.headers);
		headers.set('Content-Type', 'application/json');
		headers.set('Accept', 'application/json');

		// Construction de l'URL complète
		const url = `${API_URL}${
			endpoint.startsWith('/') ? endpoint : `/${endpoint}`
		}`;

		// Création du contrôleur d'annulation pour gérer les timeouts
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 30000);

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
				let errorMessage = 'Une erreur est survenue';
				let errorData: { message?: string } | null = null;

				// Tentative de récupération du message d'erreur
				try {
					errorData = await response.json();
					errorMessage = errorData?.message || errorMessage;
				} catch {
					// Si on ne peut pas parser le JSON, on utilise le message par défaut
				}

				throw new ApiRequestError(errorMessage, response.status);
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
				throw new ApiRequestError(error.message, 0);
			}

			throw new ApiRequestError('Une erreur inconnue est survenue', 0);
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
