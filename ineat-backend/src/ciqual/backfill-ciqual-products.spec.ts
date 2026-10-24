import { backfillCiqualProducts } from './backfill-ciqual-products';
import { CiqualReferenceService } from './ciqual-reference.service';

describe('backfillCiqualProducts', () => {
  it('enriches an existing unpackaged product with CIQUAL values', async () => {
    const product = {
      id: 'product-1',
      name: 'Fruit de la passion 1 pièce',
      barcode: null,
      ciqualCode: null,
      nutrients: null,
      Category: { slug: 'fruits-et-legumes' },
    };
    const prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([product]),
        update: jest.fn().mockResolvedValue(product),
      },
    };

    const result = await backfillCiqualProducts(
      prisma as never,
      new CiqualReferenceService(),
    );

    expect(result).toEqual({ scanned: 1, matched: 1, updated: 1 });
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {
        Category: { slug: { in: ['fruits-et-legumes', 'viandes-et-poissons'] } },
      },
      include: { Category: true },
    });
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-1' },
        data: expect.objectContaining({
          ciqualCode: '13016',
          nutrients: expect.objectContaining({ energy: 102, fiber: 6.8 }),
        }),
      }),
    );
  });

  it('does not overwrite existing nutritional data', async () => {
    const prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'product-1',
            name: 'Mangue',
            barcode: null,
            ciqualCode: null,
            nutrients: { energy: 60 },
            Category: { slug: 'fruits-et-legumes' },
          },
        ]),
        update: jest.fn(),
      },
    };

    const result = await backfillCiqualProducts(prisma as never);

    expect(result).toEqual({ scanned: 1, matched: 0, updated: 0 });
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});
