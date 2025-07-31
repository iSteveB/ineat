/**
 * Tests pour le service OpenFoodFacts avec mocks
 *
 * Utilise des mocks pour éviter les appels API réels en environnement de test
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
	OpenFoodFactsService,
	createTestOpenFoodFactsService,
} from '@/services/openFoodFactsServices';
import {
	OFF_UTILS,
	OFF_ERROR_MESSAGES,
	OFF_URLS,
	OffProduct,
	OffProductResponse,
} from '../schemas/openfoodfact';

// Mock des réponses API typiques
const mockNutellaResponse: OffProductResponse = {
	code: '3017624010701',
	status: 1,
	status_verbose: 'product found',
	product: {
		code: '3017624010701',
		product_name: 'Nutella',
		product_name_fr: 'Nutella',
		brands: 'Ferrero',
		categories_tags_en: [
			'en:spreads',
			'en:sweet-spreads',
			'en:chocolate-spreads',
		],
		quantity: '750g',
		nutrition_grades: 'e',
		nova_group: 4,
		image_front_url:
			'https://images.openfoodfacts.org/images/products/301/762/401/0701/front_fr.jpg',
		selected_images: {
			front: {
				display: {
					fr: 'https://images.openfoodfacts.org/images/products/301/762/401/0701/front_fr.4.400.jpg',
				},
			},
		},
	},
};

const mockNotFoundResponse: OffProductResponse = {
	code: '9999999999999',
	status: 0,
	status_verbose: 'product not found',
};

// Mock global de fetch
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

// Helper pour créer une vraie Response
const createMockResponse = (data: unknown, status: number = 200): Response => {
	return new Response(JSON.stringify(data), {
		status,
		statusText:
			status === 200
				? 'OK'
				: status === 429
				? 'Too Many Requests'
				: 'Error',
		headers: {
			'Content-Type': 'application/json',
		},
	});
};

// Helper pour créer une Response d'erreur
const createErrorResponse = (status: number): Response => {
	return new Response(null, {
		status,
		statusText:
			status === 429
				? 'Too Many Requests'
				: status === 500
				? 'Internal Server Error'
				: 'Error',
	});
};

describe('OpenFoodFactsService', () => {
	let service: OpenFoodFactsService;

	beforeEach(() => {
		// Reset les mocks avant chaque test
		vi.clearAllMocks();
		service = createTestOpenFoodFactsService();
	});

	describe('Configuration', () => {
		it('devrait utiliser la configuration par défaut', () => {
			const defaultService = new OpenFoodFactsService();
			expect(defaultService['config'].baseUrl).toBe(OFF_URLS.PRODUCTION);
		});

		it('devrait accepter une configuration personnalisée', () => {
			const customService = new OpenFoodFactsService({
				baseUrl: 'https://custom.url',
				userAgent: 'TestApp/1.0 (test@test.com)',
				timeout: 5000,
			});

			expect(customService['config'].baseUrl).toBe('https://custom.url');
			expect(customService['config'].userAgent).toBe(
				'TestApp/1.0 (test@test.com)'
			);
			expect(customService['config'].timeout).toBe(5000);
		});
	});

	describe('getProductByBarcode', () => {
		it('devrait récupérer un produit existant (Nutella)', async () => {
			// Mock de la réponse API avec une vraie Response
			mockFetch.mockResolvedValueOnce(
				createMockResponse(mockNutellaResponse)
			);

			const barcode = '3017624010701';
			const product = await service.getProductByBarcode(barcode);

			expect(product).not.toBeNull();
			expect(product?.code).toBe(barcode);
			expect(product?.product_name).toBe('Nutella');
			expect(product?.brands).toBe('Ferrero');

			// Vérifier que fetch a été appelé
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Vérifier l'URL dans l'appel (que ce soit string ou Request object)
			const call = mockFetch.mock.calls[0];
			const urlOrRequest = call[0];
			const url =
				typeof urlOrRequest === 'string'
					? urlOrRequest
					: urlOrRequest.url;
			expect(url).toContain(`/api/v2/product/${barcode}`);
		});

		it('devrait retourner null pour un produit inexistant', async () => {
			// Mock de la réponse "produit non trouvé"
			mockFetch.mockResolvedValueOnce(
				createMockResponse(mockNotFoundResponse)
			);

			const barcode = '9999999999999';
			const product = await service.getProductByBarcode(barcode);

			expect(product).toBeNull();
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('devrait filtrer les champs demandés', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockResponse(mockNutellaResponse)
			);

			const barcode = '3017624010701';
			const fields = ['product_name', 'brands'];

			await service.getProductByBarcode(barcode, fields);

			// Vérifier que l'URL contient les champs demandés
			expect(mockFetch).toHaveBeenCalledTimes(1);
			const call = mockFetch.mock.calls[0];
			const urlOrRequest = call[0];
			const url =
				typeof urlOrRequest === 'string'
					? urlOrRequest
					: urlOrRequest.url;
			expect(url).toContain('fields=product_name,brands');
		});

		it('devrait rejeter un code-barre invalide', async () => {
			const invalidBarcode = 'abc123';

			await expect(
				service.getProductByBarcode(invalidBarcode)
			).rejects.toMatchObject({
				type: 'INVALID_BARCODE',
				message: OFF_ERROR_MESSAGES.INVALID_BARCODE,
			});

			// Vérifier que fetch n'a pas été appelé
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('devrait gérer les erreurs de rate limit', async () => {
			// Mock d'une réponse 429 (Too Many Requests)
			mockFetch.mockResolvedValueOnce(createErrorResponse(429));

			const barcode = '3017624010701';

			await expect(
				service.getProductByBarcode(barcode)
			).rejects.toMatchObject({
				type: 'RATE_LIMIT',
				message: OFF_ERROR_MESSAGES.RATE_LIMIT,
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('devrait gérer les erreurs API (500)', async () => {
			// Mock d'une erreur serveur
			mockFetch.mockResolvedValueOnce(createErrorResponse(500));

			const barcode = '3017624010701';

			await expect(
				service.getProductByBarcode(barcode)
			).rejects.toMatchObject({
				type: 'API_ERROR',
				message: expect.stringContaining(OFF_ERROR_MESSAGES.API_ERROR),
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('devrait gérer les erreurs réseau', async () => {
			// Mock d'une erreur réseau
			mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

			const barcode = '3017624010701';

			await expect(
				service.getProductByBarcode(barcode)
			).rejects.toMatchObject({
				type: 'NETWORK_ERROR',
				message: OFF_ERROR_MESSAGES.NETWORK_ERROR,
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('devrait gérer les timeouts', async () => {
			const slowService = new OpenFoodFactsService({ timeout: 10 }); // 10ms timeout

			// Mock d'une réponse très lente (sera interrompue par AbortController)
			mockFetch.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						setTimeout(
							() =>
								resolve(
									createMockResponse(mockNutellaResponse)
								),
							100
						); // 100ms delay
					})
			);

			const barcode = '3017624010701';

			// Le timeout devrait déclencher une erreur
			await expect(
				slowService.getProductByBarcode(barcode)
			).rejects.toThrow();

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('devrait gérer les réponses JSON invalides', async () => {
			// Mock d'une réponse avec JSON malformé
			mockFetch.mockResolvedValueOnce(
				new Response('invalid json', {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			);

			const barcode = '3017624010701';

			await expect(
				service.getProductByBarcode(barcode)
			).rejects.toMatchObject({
				type: 'UNKNOWN_ERROR',
				message: OFF_ERROR_MESSAGES.UNKNOWN_ERROR,
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	describe('mapToLocalProduct', () => {
		it('devrait mapper correctement un produit OFF vers Product local', () => {
			const offProduct: OffProduct = {
				code: '3017624010701',
				product_name: 'Nutella',
				product_name_fr: 'Nutella',
				brands: 'Ferrero',
				categories_tags_en: [
					'spreads',
					'sweet-spreads',
					'chocolate-spreads',
				],
				quantity: '750g',
				nutrition_grades: 'e',
				nova_group: 4,
			};

			const localProduct = service.mapToLocalProduct(offProduct);

			expect(localProduct.name).toBe('Nutella');
			expect(localProduct.brand).toBe('Ferrero');
			expect(localProduct.category).toBeUndefined(); // Non mappé automatiquement
		});

		it('devrait gérer les produits avec des données manquantes', () => {
			const offProduct: OffProduct = {
				code: '1234567890123',
				// Pas de product_name
				// Pas de brands
			};

			const localProduct = service.mapToLocalProduct(offProduct);

			expect(localProduct.name).toBe('-');
			expect(localProduct.brand).toBe('-');
		});

		it("devrait prioriser les noms selon l'ordre prévu", () => {
			const offProduct: OffProduct = {
				code: '1234567890123',
				product_name: 'Nom principal',
				product_name_fr: 'Nom français',
				product_name_en: 'English name',
			};

			const localProduct = service.mapToLocalProduct(offProduct);

			// product_name a la priorité
			expect(localProduct.name).toBe('Nom principal');
		});

		it('devrait utiliser product_name_fr si product_name manque', () => {
			const offProduct: OffProduct = {
				code: '1234567890123',
				product_name_fr: 'Nom français',
				product_name_en: 'English name',
			};

			const localProduct = service.mapToLocalProduct(offProduct);

			expect(localProduct.name).toBe('Nom français');
		});

		it('devrait utiliser product_name_en en dernier recours', () => {
			const offProduct: OffProduct = {
				code: '1234567890123',
				product_name_en: 'English name',
			};

			const localProduct = service.mapToLocalProduct(offProduct);

			expect(localProduct.name).toBe('English name');
		});
	});

	describe('getProductImageUrl', () => {
		it("devrait retourner null si pas d'image", () => {
			const offProduct: OffProduct = {
				code: '1234567890123',
			};

			const imageUrl = service.getProductImageUrl(offProduct);

			expect(imageUrl).toBeNull();
		});

		it('devrait utiliser image_front_url en fallback', () => {
			const offProduct: OffProduct = {
				code: '1234567890123',
				image_front_url: 'https://example.com/image.jpg',
			};

			const imageUrl = service.getProductImageUrl(offProduct);

			expect(imageUrl).toBe('https://example.com/image.jpg');
		});

		it('devrait utiliser selected_images si disponible', () => {
			const offProduct: OffProduct = {
				code: '1234567890123',
				selected_images: {
					front: {
						display: {
							fr: 'https://images.openfoodfacts.org/selected.jpg',
						},
					},
				},
				image_front_url: 'https://example.com/fallback.jpg',
			};

			const imageUrl = service.getProductImageUrl(
				offProduct,
				'400',
				'fr'
			);

			expect(imageUrl).toBe(
				'https://images.openfoodfacts.org/selected.jpg'
			);
		});

		it("devrait construire l'URL avec la bonne taille pour images complexes", () => {
			const offProduct: OffProduct = {
				code: '3017624010701',
				images: {
					front_fr: {
						rev: '4',
						imgid: '1',
						sizes: { '400': { w: 400, h: 500 } },
						x1: null,
						y1: null,
						x2: null,
						y2: null,
						angle: null,
						white_magic: '0',
						normalize: '0',
						geometry: '0x0-0-0',
					},
				},
			};

			const imageUrl = service.getProductImageUrl(
				offProduct,
				'400',
				'fr'
			);

			expect(imageUrl).toContain('301/762/401/0701');
			expect(imageUrl).toContain('front_fr.4.400.jpg');
		});
	});

	describe('getMainCategoryString', () => {
		it('devrait extraire et formater la catégorie principale', () => {
			const offProduct: OffProduct = {
				categories_tags_en: [
					'en:plant-based-foods-and-beverages',
					'en:plant-based-foods',
					'en:nuts-and-their-products',
					'en:nuts',
					'en:tree-nuts',
				],
			};

			const category = service.getMainCategoryString(offProduct);

			expect(category).toBe('Tree Nuts');
		});

		it('devrait retourner "-" si pas de catégories', () => {
			const offProduct: OffProduct = {
				code: '1234567890123',
			};

			const category = service.getMainCategoryString(offProduct);

			expect(category).toBe('-');
		});

		it('devrait nettoyer le préfixe "en:" et formater', () => {
			const offProduct: OffProduct = {
				categories_tags_en: ['en:chocolate-spreads'],
			};

			const category = service.getMainCategoryString(offProduct);

			expect(category).toBe('Chocolate Spreads');
		});
	});

	describe('buildImageFolderPath', () => {
		it('devrait construire le bon chemin pour un code-barre 13 chiffres', () => {
			const service = new OpenFoodFactsService();
			const path = service['buildImageFolderPath']('3017624010701');

			expect(path).toBe('301/762/401/0701');
		});

		it('devrait padder les codes-barres courts', () => {
			const service = new OpenFoodFactsService();
			const path = service['buildImageFolderPath']('12345678');

			expect(path).toBe('000/001/234/5678');
		});
	});
});

describe('OFF_UTILS', () => {
	describe('isValidBarcode', () => {
		it('devrait valider les codes-barres corrects', () => {
			expect(OFF_UTILS.isValidBarcode('3017624010701')).toBe(true); // EAN-13
			expect(OFF_UTILS.isValidBarcode('12345678')).toBe(true); // EAN-8
			expect(OFF_UTILS.isValidBarcode('123456789012')).toBe(true); // UPC-A
		});

		it('devrait rejeter les codes-barres incorrects', () => {
			expect(OFF_UTILS.isValidBarcode('abc123')).toBe(false); // Lettres
			expect(OFF_UTILS.isValidBarcode('1234567')).toBe(false); // Trop court
			expect(OFF_UTILS.isValidBarcode('12345678901234')).toBe(false); // Trop long
			expect(OFF_UTILS.isValidBarcode('')).toBe(false); // Vide
			expect(OFF_UTILS.isValidBarcode('123 456')).toBe(false); // Espaces
		});
	});

	describe('normalizeBarcode', () => {
		it('devrait normaliser les codes-barres valides', () => {
			expect(OFF_UTILS.normalizeBarcode('  3017624010701  ')).toBe(
				'3017624010701'
			);
			expect(OFF_UTILS.normalizeBarcode('12345678')).toBe('12345678');
		});

		it('devrait retourner null pour les codes-barres invalides', () => {
			expect(OFF_UTILS.normalizeBarcode('abc123')).toBeNull();
			expect(OFF_UTILS.normalizeBarcode('')).toBeNull();
		});
	});

	describe('isValidNutriScore', () => {
		it('devrait valider les Nutri-Scores corrects', () => {
			expect(OFF_UTILS.isValidNutriScore('a')).toBe(true);
			expect(OFF_UTILS.isValidNutriScore('b')).toBe(true);
			expect(OFF_UTILS.isValidNutriScore('c')).toBe(true);
			expect(OFF_UTILS.isValidNutriScore('d')).toBe(true);
			expect(OFF_UTILS.isValidNutriScore('e')).toBe(true);
		});

		it('devrait rejeter les Nutri-Scores incorrects', () => {
			expect(OFF_UTILS.isValidNutriScore('f')).toBe(false);
			expect(OFF_UTILS.isValidNutriScore('A')).toBe(false); // Majuscule
			expect(OFF_UTILS.isValidNutriScore('')).toBe(false);
			expect(OFF_UTILS.isValidNutriScore('1')).toBe(false);
		});
	});

	describe('isValidNovaGroup', () => {
		it('devrait valider les groupes NOVA corrects', () => {
			expect(OFF_UTILS.isValidNovaGroup(1)).toBe(true);
			expect(OFF_UTILS.isValidNovaGroup(2)).toBe(true);
			expect(OFF_UTILS.isValidNovaGroup(3)).toBe(true);
			expect(OFF_UTILS.isValidNovaGroup(4)).toBe(true);
		});

		it('devrait rejeter les groupes NOVA incorrects', () => {
			expect(OFF_UTILS.isValidNovaGroup(0)).toBe(false);
			expect(OFF_UTILS.isValidNovaGroup(5)).toBe(false);
			expect(OFF_UTILS.isValidNovaGroup(-1)).toBe(false);
		});
	});

	describe('buildUserAgent', () => {
		it('devrait construire un User-Agent correct', () => {
			const userAgent = OFF_UTILS.buildUserAgent(
				'MonApp',
				'1.0.0',
				'contact@monapp.com'
			);

			expect(userAgent).toBe('MonApp/1.0.0 (contact@monapp.com)');
		});
	});

	describe('getErrorMessage', () => {
		it("devrait retourner les messages d'erreur corrects", () => {
			expect(OFF_UTILS.getErrorMessage('NETWORK_ERROR')).toBe(
				OFF_ERROR_MESSAGES.NETWORK_ERROR
			);
			expect(OFF_UTILS.getErrorMessage('PRODUCT_NOT_FOUND')).toBe(
				OFF_ERROR_MESSAGES.PRODUCT_NOT_FOUND
			);
			expect(OFF_UTILS.getErrorMessage('INVALID_BARCODE')).toBe(
				OFF_ERROR_MESSAGES.INVALID_BARCODE
			);
		});
	});
});
