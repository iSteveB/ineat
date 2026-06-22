import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  const tx = {
    product: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    inventoryItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
    category: {
      findFirst: jest.fn(),
    },
    inventoryItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  const budgetService = {
    getBudgetStats: jest.fn(),
  };

  const expenseService = {
    createExpenseFromProduct: jest.fn(),
  };

  let service: InventoryService;

  const category = {
    id: 'category-1',
    name: 'Fruits',
    slug: 'fruits',
    icon: 'apple',
  };

  const product = {
    id: 'product-1',
    name: 'Pommes',
    brand: null,
    barcode: null,
    unitType: 'KG',
    nutriscore: null,
    ecoscore: null,
    novascore: null,
    ingredients: null,
    imageUrl: null,
    nutrients: null,
    Category: category,
  };

  const inventoryItem = {
    id: 'item-1',
    quantity: 2,
    purchaseDate: new Date('2026-05-01'),
    expiryDate: new Date('2026-05-10'),
    expiryDateSource: 'MANUAL',
    purchasePrice: 4.5,
    storageLocation: 'frigo',
    notes: 'bio',
    createdAt: new Date('2026-05-01T08:00:00Z'),
    updatedAt: new Date('2026-05-01T08:00:00Z'),
    Product: product,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService(
      prisma as any,
      budgetService as any,
      expenseService as any,
    );
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    prisma.category.findFirst.mockResolvedValue(category);
    tx.category.findFirst.mockResolvedValue(category);
    tx.product.findUnique.mockResolvedValue(null);
    tx.product.findFirst.mockResolvedValue(null);
    tx.product.create.mockResolvedValue(product);
    tx.inventoryItem.findFirst.mockResolvedValue(null);
    tx.inventoryItem.create.mockImplementation(({ data }) =>
      Promise.resolve({
        ...inventoryItem,
        ...data,
        Product: product,
        createdAt: inventoryItem.createdAt,
        updatedAt: inventoryItem.updatedAt,
      }),
    );
    tx.inventoryItem.update.mockImplementation(({ data }) =>
      Promise.resolve({
        ...inventoryItem,
        ...data,
        Product: product,
        updatedAt: data.updatedAt,
      }),
    );
    expenseService.createExpenseFromProduct.mockResolvedValue({
      expense: null,
      budgetId: null,
      budgetUpdated: false,
      message: 'Aucun budget disponible',
    });
  });

  it('adds a manual product and returns budget impact without external calls', async () => {
    const result = await service.addManualProduct('user-1', {
      name: 'Pommes',
      category: 'fruits',
      quantity: 2,
      unitType: 'KG',
      purchaseDate: '2026-05-01',
      expiryDate: '2026-05-10',
      purchasePrice: 4.5,
      storageLocation: 'frigo',
      packageStatus: 'OPENED',
      preparationStatus: 'RAW',
      notes: 'bio',
    } as any);

    expect(tx.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Pommes',
          categoryId: 'category-1',
          unitType: 'KG',
        }),
        include: { Category: true },
      }),
    );
    expect(tx.inventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          productId: 'product-1',
          quantity: 2,
          expiryDate: expect.objectContaining({
            getTime: expect.any(Function),
          }),
          expiryDateSource: 'MANUAL',
          packageStatus: 'OPENED',
          preparationStatus: 'RAW',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'Pommes',
        category: 'fruits',
        expiryDateSource: 'MANUAL',
        expiryDateRuleLevel: 'manual',
        packageStatus: 'OPENED',
        preparationStatus: 'RAW',
        budgetImpact: {
          expenseCreated: false,
          message: 'Aucun budget disponible',
        },
      }),
    );
  });

  it('estimates an expiry date when a manual product has no expiry date', async () => {
    const result = await service.addManualProduct('user-1', {
      name: 'Pommes',
      category: 'fruits',
      quantity: 2,
      unitType: 'KG',
      purchaseDate: '2026-05-01',
      storageLocation: 'frigo',
    } as any);

    expect(tx.inventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expiryDate: new Date('2026-05-08'),
          expiryDateSource: 'ESTIMATED',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        expiryDateSource: 'ESTIMATED',
        expiryDateReason: 'fruits et légumes + frigo',
        expiryDateRuleId: 'fruits-et-legumes',
        expiryDateRuleLevel: 'category',
        expiryDateDurationDays: 7,
      }),
    );
  });

  it('rejects manual products with unknown categories', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.addManualProduct('user-1', {
        name: 'Pommes',
        category: 'missing',
        quantity: 1,
        unitType: 'KG',
        purchaseDate: '2026-05-01',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects manual products with invalid business values before writing', async () => {
    await expect(
      service.addManualProduct('user-1', {
        name: 'Pommes',
        category: 'fruits',
        quantity: 0,
        unitType: 'KG',
        purchaseDate: '2026-05-01',
      } as any),
    ).rejects.toThrow('La quantité doit être supérieure à 0');

    await expect(
      service.addManualProduct('user-1', {
        name: 'Pommes',
        category: 'fruits',
        quantity: 1,
        unitType: 'KG',
        purchaseDate: '2999-05-01',
      } as any),
    ).rejects.toThrow("La date d'achat ne peut pas être dans le futur");

    await expect(
      service.addManualProduct('user-1', {
        name: 'Pommes',
        category: 'fruits',
        quantity: 1,
        unitType: 'KG',
        purchaseDate: '2026-05-10',
        expiryDate: '2026-05-01',
      } as any),
    ).rejects.toThrow(
      "La date de péremption doit être postérieure à la date d'achat",
    );

    expect(tx.inventoryItem.create).not.toHaveBeenCalled();
  });

  it('adds an existing product with quick add', async () => {
    tx.product.findUnique.mockResolvedValue(product);

    const result = await service.addExistingProductToInventory('user-1', {
      productId: 'product-1',
      quantity: 1,
      purchaseDate: '2026-05-01',
      expiryDate: '2026-05-10',
    } as any);

    expect(tx.inventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          productId: 'product-1',
          quantity: 1,
        }),
      }),
    );
    expect(result.name).toBe('Pommes');
  });

  it('rejects quick add with invalid quantity, price or dates', async () => {
    await expect(
      service.addExistingProductToInventory('user-1', {
        productId: 'product-1',
        quantity: -1,
        purchaseDate: '2026-05-01',
      } as any),
    ).rejects.toThrow('La quantité doit être supérieure à 0');

    await expect(
      service.addExistingProductToInventory('user-1', {
        productId: 'product-1',
        quantity: 1,
        purchaseDate: '2026-05-01',
        purchasePrice: -2,
      } as any),
    ).rejects.toThrow("Le prix d'achat ne peut pas être négatif");

    await expect(
      service.addExistingProductToInventory('user-1', {
        productId: 'product-1',
        quantity: 1,
        purchaseDate: 'not-a-date',
      } as any),
    ).rejects.toThrow("La date d'achat doit être valide");

    expect(tx.product.findUnique).not.toHaveBeenCalled();
  });

  it('rejects quick add when the product does not exist', async () => {
    tx.product.findUnique.mockResolvedValue(null);

    await expect(
      service.addExistingProductToInventory('user-1', {
        productId: 'missing-product',
        quantity: 1,
        purchaseDate: '2026-05-01',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('passes inventory filters to Prisma', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([]);

    await service.getUserInventory('user-1', {
      category: 'fruits',
      storageLocation: 'frigo',
      expiringWithinDays: 7,
    });

    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          Product: {
            Category: {
              OR: [{ id: 'fruits' }, { slug: 'fruits' }],
            },
          },
          storageLocation: 'frigo',
          expiryDate: expect.objectContaining({
            lte: expect.any(Date),
            gte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it('groups inventory lots by product and keeps lot-level expiry dates', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        ...inventoryItem,
        id: 'lot-1',
        productId: 'product-1',
        userId: 'user-1',
        quantity: 2,
        expiryDate: new Date('2026-07-10'),
        purchaseDate: new Date('2026-06-01'),
      },
      {
        ...inventoryItem,
        id: 'lot-2',
        productId: 'product-1',
        userId: 'user-1',
        quantity: 2,
        expiryDate: new Date('2026-07-20'),
        purchaseDate: new Date('2026-06-02'),
      },
    ]);

    const result = await service.getUserInventory('user-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'lot-1',
        productId: 'product-1',
        quantity: 4,
        lots: [
          expect.objectContaining({
            id: 'lot-1',
            quantity: 2,
            expiryDate: new Date('2026-07-10'),
          }),
          expect.objectContaining({
            id: 'lot-2',
            quantity: 2,
            expiryDate: new Date('2026-07-20'),
          }),
        ],
      }),
    );
  });

  it('paginates grouped products rather than raw lots', async () => {
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        ...inventoryItem,
        id: 'lot-1',
        productId: 'product-1',
        userId: 'user-1',
        quantity: 2,
        Product: product,
      },
      {
        ...inventoryItem,
        id: 'lot-2',
        productId: 'product-1',
        userId: 'user-1',
        quantity: 2,
        Product: product,
      },
      {
        ...inventoryItem,
        id: 'lot-3',
        productId: 'product-2',
        userId: 'user-1',
        quantity: 1,
        Product: {
          ...product,
          id: 'product-2',
          name: 'Lait',
        },
      },
    ]);

    const result = await service.getUserInventory(
      'user-1',
      undefined,
      { page: 1, limit: 1 },
    );

    expect(result).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            productId: 'product-1',
            quantity: 4,
          }),
        ],
        pagination: expect.objectContaining({
          currentPage: 1,
          pageSize: 1,
          totalItems: 2,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        }),
      }),
    );
  });

  it('updates an inventory item owned by the user', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValue({ id: 'item-1' });
    prisma.inventoryItem.update.mockResolvedValue({
      ...inventoryItem,
      quantity: 3,
    });

    const result = await service.updateInventoryItem('user-1', 'item-1', {
      quantity: 3,
    });

    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item-1' },
        data: { quantity: 3 },
      }),
    );
    expect(result.quantity).toBe(3);
  });

  it('recalculates an estimated expiry date when product context changes', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValue({
      ...inventoryItem,
      expiryDateSource: 'ESTIMATED',
      expiryDate: new Date('2026-05-15'),
      productId: 'product-1',
      Product: {
        ...product,
        name: 'Lait',
        Category: {
          ...category,
          name: 'Produits laitiers',
          slug: 'produits-laitiers',
        },
      },
    });
    prisma.inventoryItem.update.mockImplementation(({ data }) =>
      Promise.resolve({
        ...inventoryItem,
        ...data,
        Product: product,
      }),
    );

    const result = await service.updateInventoryItem('user-1', 'item-1', {
      packageStatus: 'OPENED',
    } as any);

    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          packageStatus: 'OPENED',
          expiryDate: new Date('2026-05-06'),
          expiryDateSource: 'ESTIMATED',
        }),
      }),
    );
    expect(result.expiryDate).toEqual(new Date('2026-05-06'));
  });

  it('keeps a manual expiry date when product context changes', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValue({
      ...inventoryItem,
      expiryDateSource: 'MANUAL',
      Product: product,
    });
    prisma.inventoryItem.update.mockImplementation(({ data }) =>
      Promise.resolve({
        ...inventoryItem,
        ...data,
        Product: product,
      }),
    );

    await service.updateInventoryItem('user-1', 'item-1', {
      storageLocation: 'congelateur',
    });

    expect(prisma.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          storageLocation: 'congelateur',
        },
      }),
    );
  });

  it('rejects update for missing inventory item', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValue(null);

    await expect(
      service.updateInventoryItem('user-1', 'missing-item', { quantity: 3 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes an inventory item owned by the user', async () => {
    prisma.inventoryItem.findFirst.mockResolvedValue({ id: 'item-1' });
    prisma.inventoryItem.delete.mockResolvedValue({ id: 'item-1' });

    await expect(
      service.removeInventoryItem('user-1', 'item-1'),
    ).resolves.toEqual({
      success: true,
      message: "Produit supprimé de l'inventaire",
    });
    expect(prisma.inventoryItem.delete).toHaveBeenCalledWith({
      where: { id: 'item-1' },
    });
  });

  it('deletes multiple inventory items owned by the user', async () => {
    prisma.inventoryItem.deleteMany.mockResolvedValue({ count: 2 });

    await expect(
      service.removeInventoryItems('user-1', ['item-1', 'item-2', 'item-1']),
    ).resolves.toEqual({
      success: true,
      deletedCount: 2,
      message: "2 produits supprimés de l'inventaire",
    });
    expect(prisma.inventoryItem.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['item-1', 'item-2'] },
        userId: 'user-1',
      },
    });
  });

  it('increments an existing lot for duplicate manual inventory items', async () => {
    tx.inventoryItem.findFirst.mockResolvedValue({
      ...inventoryItem,
      id: 'duplicate',
      quantity: 2,
      purchasePrice: 4,
    });

    const result = await service.addManualProduct('user-1', {
      name: 'Pommes',
      category: 'fruits',
      quantity: 1,
      unitType: 'KG',
      purchaseDate: '2026-05-01',
      expiryDate: '2026-05-10',
      purchasePrice: 2,
    } as any);

    expect(tx.inventoryItem.create).not.toHaveBeenCalled();
    expect(tx.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'duplicate' },
        data: expect.objectContaining({
          quantity: 3,
          purchasePrice: 6,
        }),
      }),
    );
    expect(result.quantity).toBe(3);
  });
});
