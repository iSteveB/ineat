import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenFoodFactsInvoiceEnrichmentService } from './openfoodfacts-invoice-enrichment.service';

describe('OpenFoodFactsInvoiceEnrichmentService', () => {
  const configService = {
    get: jest.fn(),
  };

  let service: OpenFoodFactsInvoiceEnrichmentService;
  let loggerSpy: jest.SpyInstance;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    configService.get.mockImplementation((key: string) => {
      if (key === 'OPENFOODFACTS_BASE_URL') {
        return 'https://world.openfoodfacts.test';
      }

      if (key === 'OPENFOODFACTS_TIMEOUT_MS') {
        return '2500';
      }

      return undefined;
    });
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new OpenFoodFactsInvoiceEnrichmentService(
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    loggerSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('enrichit une ligne avec un produit OpenFoodFacts trouvé', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 1,
        product: {
          code: '3017624010701',
          product_name_fr: 'Nutella',
          brands: 'Ferrero',
          quantity: '400 g',
          image_front_url: 'https://images.example/nutella.jpg',
          categories_tags_fr: ['fr:pates-a-tartiner'],
          nutriscore_grade: 'e',
          ecoscore_grade: 'd',
          nova_group: 4,
          ingredients_text_fr: 'Sucre, huile de palme, noisettes',
          nutriments: {
            'energy-kcal_100g': 539,
            carbohydrates_100g: 57.5,
            sugars_100g: 56.3,
            proteins_100g: 6.3,
            fat_100g: 30.9,
            'saturated-fat_100g': 10.6,
            fiber_100g: 0,
            salt_100g: 0.1,
          },
          completeness: 0.92,
        },
      }),
    });

    const [result] = await service.enrichItems([
      {
        detectedName: 'Nutella',
        quantity: 1,
        confidence: 0.9,
        productCode: '3017624010701',
        suggestedEans: [],
      },
    ]);

    const [lookupUrl] = fetchMock.mock.calls[0];
    expect(lookupUrl).toContain(
      'https://world.openfoodfacts.test/api/v2/product/3017624010701',
    );
    expect(lookupUrl).toContain('nutriscore_grade');
    expect(lookupUrl).toContain('ecoscore_grade');
    expect(lookupUrl).toContain('nova_group');
    expect(lookupUrl).toContain('ingredients_text_fr');
    expect(lookupUrl).toContain('nutriments');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
        }),
      }),
    );
    expect(result).toMatchObject({
      selectedEan: '3017624010701',
      suggestedEans: ['3017624010701'],
      externalProductProvider: 'openfoodfacts',
      externalProductStatus: 'FOUND',
      externalProductData: {
        source: 'openfoodfacts',
        barcode: '3017624010701',
        name: 'Nutella',
        brand: 'Ferrero',
        quantity: '400 g',
        imageUrl: 'https://images.example/nutella.jpg',
        categoriesTags: ['fr:pates-a-tartiner'],
        nutriscore: 'E',
        ecoscore: 'D',
        novascore: 'GROUP_4',
        ingredients: 'Sucre, huile de palme, noisettes',
        nutrients: {
          energy: 539,
          carbohydrates: 57.5,
          sugars: 56.3,
          proteins: 6.3,
          fats: 30.9,
          saturatedFats: 10.6,
          fiber: 0,
          salt: 0.1,
        },
        completeness: 0.92,
      },
      externalProductError: null,
    });
  });

  it('marque une ligne comme introuvable sans échouer', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 0,
        status_verbose: 'product not found',
      }),
    });

    const result = await service.lookupBarcode('9999999999999');

    expect(result).toEqual({
      status: 'NOT_FOUND',
      data: null,
      error: null,
    });
  });

  it('retourne un statut erreur quand OpenFoodFacts échoue', async () => {
    fetchMock.mockRejectedValue(new Error('NETWORK_ERROR'));

    const [result] = await service.enrichItems([
      {
        detectedName: 'Produit réseau',
        quantity: 1,
        confidence: 0.8,
        selectedEan: '3564700012345',
      },
    ]);

    expect(result).toMatchObject({
      selectedEan: '3564700012345',
      externalProductProvider: 'openfoodfacts',
      externalProductStatus: 'ERROR',
      externalProductData: null,
      externalProductError: 'NETWORK_ERROR',
    });
  });

  it('marque les produits trouvés mais sans nom comme incomplets', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 1,
        product: {
          code: '3564700012345',
          brands: 'Marque test',
        },
      }),
    });

    const result = await service.lookupBarcode('3564700012345');

    expect(result.status).toBe('INCOMPLETE');
    expect(result.data).toMatchObject({
      barcode: '3564700012345',
      brand: 'Marque test',
      name: null,
    });
  });
});
