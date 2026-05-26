import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const prisma = {
    product: {
      findMany: jest.fn(),
    },
  };

  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(prisma as any);
  });

  it('formats product search results from Prisma relations for the frontend contract', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Lait entier',
        brand: 'Ferme',
        barcode: '3017624010701',
        unitType: 'L',
        nutriscore: 'B',
        ecoscore: 'A',
        novascore: 'GROUP_1',
        imageUrl: 'https://example.com/lait.jpg',
        Category: {
          id: 'category-1',
          name: 'Produits laitiers',
          slug: 'produits-laitiers',
          icon: 'milk',
        },
      },
    ]);

    const results = await service.searchProducts('lait', 5);

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { Category: true },
        take: 5,
      }),
    );
    expect(results).toEqual([
      expect.objectContaining({
        id: 'product-1',
        name: 'Lait entier',
        category: {
          id: 'category-1',
          name: 'Produits laitiers',
          slug: 'produits-laitiers',
          icon: 'milk',
        },
      }),
    ]);
  });
});
