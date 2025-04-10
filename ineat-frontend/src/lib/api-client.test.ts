import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiRequestError } from './api-client';
import { fail } from 'assert';

// Sauvegarde de la version originale de fetch
const originalFetch = global.fetch;

describe('apiClient', () => {
	// Configurer les mocks avant chaque test
	beforeEach(() => {
		// Mock de fetch
		global.fetch = vi.fn();

		// Mock de setTimeout
		vi.useFakeTimers();
	});

	// Restaurer les originaux après chaque test
	afterEach(() => {
		global.fetch = originalFetch;
		vi.useRealTimers();
		vi.resetAllMocks();
	});

	describe('fetch', () => {
		it('devrait effectuer une requête avec les en-têtes et options corrects', async () => {
			// Préparation de la réponse mock
			const mockResponse = {
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ data: 'test' }),
			};

			// Configuration du mock de fetch
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse
			);

			// Exécution de la requête
			const result = await apiClient.fetch('/test-endpoint');

			// Vérifications
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/test-endpoint'),
				expect.objectContaining({
					headers: expect.any(Headers),
					credentials: 'include',
					signal: expect.any(AbortSignal),
				})
			);

			// Vérification du header Content-Type
			const headers = (global.fetch as ReturnType<typeof vi.fn>).mock
				.calls[0][1].headers;
			expect(headers.get('Content-Type')).toBe('application/json');

			// Vérification du résultat
			expect(result).toEqual({ data: 'test' });
		});

		it('devrait gérer les réponses 204 (No Content) correctement', async () => {
			// Préparation de la réponse mock
			const mockResponse = {
				ok: true,
				status: 204,
				json: vi.fn(),
			};

			// Configuration du mock de fetch
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse
			);

			// Exécution de la requête
			const result = await apiClient.fetch('/test-endpoint');

			// Vérification que json() n'a pas été appelé
			expect(mockResponse.json).not.toHaveBeenCalled();

			// Vérification du résultat
			expect(result).toBeNull();
		});

		it('devrait lancer une ApiRequestError pour les réponses non-ok', async () => {
			// Préparation de la réponse mock avec erreur
			const mockResponse = {
				ok: false,
				status: 404,
				json: vi
					.fn()
					.mockResolvedValue({ message: 'Ressource non trouvée' }),
			};

			// Configuration du mock de fetch
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse
			);

			// Vérification que l'erreur est lancée
			await expect(apiClient.fetch('/test-endpoint')).rejects.toThrow(
				ApiRequestError
			);

			// Vérification des détails de l'erreur
			try {
				await apiClient.fetch('/test-endpoint');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiRequestError);
				expect((error as ApiRequestError).status).toBe(404);
				expect((error as ApiRequestError).message).toBe(
					'Ressource non trouvée'
				);
			}
		});

		it("devrait utiliser un message d'erreur par défaut si la réponse d'erreur n'a pas de JSON valide", async () => {
			// Préparation de la réponse mock avec erreur
			const mockResponse = {
				ok: false,
				status: 500,
				json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
			};

			// Configuration du mock de fetch
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse
			);

			// Vérification des détails de l'erreur
			try {
				await apiClient.fetch('/test-endpoint');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiRequestError);
				expect((error as ApiRequestError).status).toBe(500);
				expect((error as ApiRequestError).message).toBe(
					'Une erreur est survenue'
				);
			}
		});

		it('devrait avoir un mécanisme de timeout configuré à 30 secondes', async () => {
			// Espionner la méthode setTimeout
			const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
			const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

			// Configurer fetch pour retourner une réponse réussie après un court délai
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ data: 'test' }),
			});

			// Exécuter la requête
			await apiClient.fetch('/test-endpoint');

			// Vérifier que setTimeout a été appelé avec un délai de 30000ms
			expect(setTimeoutSpy).toHaveBeenCalledWith(
				expect.any(Function),
				30000
			);

			// Vérifier aussi que clearTimeout est appelé (pour cleanup)
			expect(clearTimeoutSpy).toHaveBeenCalled();

			// Restaurer les espions
			setTimeoutSpy.mockRestore();
			clearTimeoutSpy.mockRestore();
		});

		it("devrait gérer les erreurs d'expiration", async () => {
			// Simuler une erreur AbortError
			const abortError = new Error('The operation was aborted');
			abortError.name = 'AbortError';

			// Configurer fetch pour rejeter avec une erreur d'abandon
			(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
				abortError
			);

			// Vérifier que l'erreur est convertie en ApiRequestError
			try {
				await apiClient.fetch('/test-endpoint');
				// Si on arrive ici, c'est que l'erreur n'a pas été lancée
				fail('Devrait lancer une erreur');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiRequestError);
				expect((error as ApiRequestError).status).toBe(408);
				expect((error as ApiRequestError).message).toBe(
					'La requête a expiré'
				);
			}
		});

		it('devrait gérer les erreurs réseau', async () => {
			// Simuler une erreur réseau
			(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Network error')
			);

			// Vérifier que l'erreur est convertie en ApiRequestError
			try {
				await apiClient.fetch('/test-endpoint');
			} catch (error) {
				expect(error).toBeInstanceOf(ApiRequestError);
				expect((error as ApiRequestError).status).toBe(0);
				expect((error as ApiRequestError).message).toBe(
					'Network error'
				);
			}
		});
	});

	describe('Méthodes HTTP', () => {
		const mockSuccessResponse = {
			ok: true,
			status: 200,
			json: vi.fn().mockResolvedValue({ success: true }),
		};

		beforeEach(() => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockSuccessResponse
			);
		});

		it('get() devrait appeler fetch avec la méthode GET', async () => {
			await apiClient.get('/test');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'GET',
				})
			);
		});

		it('post() devrait appeler fetch avec la méthode POST et les données', async () => {
			const data = { name: 'test' };
			await apiClient.post('/test', data);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(data),
				})
			);
		});

		it('put() devrait appeler fetch avec la méthode PUT et les données', async () => {
			const data = { name: 'test' };
			await apiClient.put('/test', data);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'PUT',
					body: JSON.stringify(data),
				})
			);
		});

		it('patch() devrait appeler fetch avec la méthode PATCH et les données', async () => {
			const data = { name: 'test' };
			await apiClient.patch('/test', data);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify(data),
				})
			);
		});

		it('delete() devrait appeler fetch avec la méthode DELETE', async () => {
			await apiClient.delete('/test');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'DELETE',
				})
			);
		});

		it('ne devrait pas inclure body si data est undefined', async () => {
			await apiClient.post('/test');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'POST',
				})
			);

			// Vérifier que body n'est pas défini
			const options = (global.fetch as ReturnType<typeof vi.fn>).mock
				.calls[0][1];
			expect(options.body).toBeUndefined();
		});
	});

	describe('Gestion des URLs', () => {
		const mockSuccessResponse = {
			ok: true,
			status: 200,
			json: vi.fn().mockResolvedValue({ success: true }),
		};

		beforeEach(() => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockSuccessResponse
			);
		});

		it('devrait préserver les endpoints commençant par / et ajouter / aux autres', async () => {
			// Endpoint avec /
			await apiClient.get('/test');
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/test'),
				expect.any(Object)
			);

			vi.resetAllMocks();
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockSuccessResponse
			);

			// Endpoint sans /
			await apiClient.get('test');
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/test'),
				expect.any(Object)
			);
		});
	});

	describe('ApiRequestError', () => {
		it('devrait étendre Error et contenir le status', () => {
			const error = new ApiRequestError('Test error', 404);

			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe('Test error');
			expect(error.status).toBe(404);
			expect(error.name).toBe('ApiRequestError');
		});
	});
});
