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

    expect(fetchMock).toHaveBeenCalledWith(
      'https://world.openfoodfacts.test/api/v2/product/3017624010701?fields=code%2Cproduct_name%2Cproduct_name_fr%2Cproduct_name_en%2Cbrands%2Cquantity%2Cimage_front_url%2Cimage_front_small_url%2Cselected_images%2Ccategories_tags%2Ccategories_tags_fr%2Ccategories_tags_en%2Ccompleteness&lc=fr',
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
