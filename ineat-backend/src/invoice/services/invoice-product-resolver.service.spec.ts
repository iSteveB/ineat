import { InvoiceProductResolverService } from './invoice-product-resolver.service';

describe('InvoiceProductResolverService', () => {
  const tx = {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
  };

  let service: InvoiceProductResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvoiceProductResolverService();
    tx.category.findFirst.mockResolvedValue({
      id: 'category-1',
      slug: 'produits-laitiers',
    });
    tx.product.findUnique.mockResolvedValue(null);
    tx.product.findMany.mockResolvedValue([]);
  });

  it('associe automatiquement un produit par EAN', async () => {
    tx.product.findUnique.mockResolvedValue({
      id: 'product-1',
      barcode: '3564700012345',
    });

    const [result] = await service.resolveItems(tx, [
      {
        detectedName: 'Lait',
        quantity: 1,
        confidence: 0.7,
        productCode: '3564700012345',
        suggestedEans: [],
      },
    ]);

    expect(tx.product.findUnique).toHaveBeenCalledWith({
      where: { barcode: '3564700012345' },
    });
    expect(result).toMatchObject({
      productId: 'product-1',
      selectedEan: '3564700012345',
      suggestedEans: ['3564700012345'],
    });
  });

  it('associe automatiquement un produit unique par nom et catégorie fiable', async () => {
    tx.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Lait demi-écrémé',
        barcode: '3564700012345',
      },
    ]);

    const [result] = await service.resolveItems(tx, [
      {
        detectedName: 'Lait demi-écrémé',
        quantity: 1,
        confidence: 0.9,
        category: 'produits-laitiers',
      },
    ]);

    expect(tx.category.findFirst).toHaveBeenCalledWith({
      where: { slug: 'produits-laitiers' },
    });
    expect(tx.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: 'category-1',
        }),
      }),
    );
    expect(result).toMatchObject({
      productId: 'product-1',
      selectedEan: '3564700012345',
      suggestedEans: ['3564700012345'],
    });
  });

  it('laisse un cas ambigu corrigeable avec suggestions EAN', async () => {
    tx.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Lait demi-écrémé',
        barcode: '3564700012345',
      },
      {
        id: 'product-2',
        name: 'Lait demi-écrémé bio',
        barcode: '3564700099999',
      },
    ]);

    const [result] = await service.resolveItems(tx, [
      {
        detectedName: 'Lait demi-écrémé',
        quantity: 1,
        confidence: 0.96,
        category: 'produits-laitiers',
      },
    ]);

    expect(result.productId).toBeUndefined();
    expect(result.suggestedEans).toEqual(['3564700012345', '3564700099999']);
  });

  it('laisse un produit inconnu sans association automatique', async () => {
    const [result] = await service.resolveItems(tx, [
      {
        detectedName: 'Produit inconnu',
        quantity: 1,
        confidence: 0.9,
      },
    ]);

    expect(result).toMatchObject({
      detectedName: 'Produit inconnu',
      suggestedEans: [],
    });
    expect(result.productId).toBeUndefined();
  });
});
