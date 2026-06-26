import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '../../../prisma/generated/prisma/client';
import { InvoiceService, InvoiceUser } from './invoice.service';

describe('InvoiceService', () => {
  const tx = {
    invoice: {
      update: jest.fn(),
    },
    invoiceItem: {
      createMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    inventoryItem: {
      create: jest.fn(),
    },
    budget: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    expense: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const prisma = {
    invoice: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    invoiceItem: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const invoiceUploadService = {
    uploadInvoicePdf: jest.fn(),
  };

  const invoiceAnalysisService = {
    analyzePdf: jest.fn(),
  };

  const invoiceProductResolverService = {
    resolveItems: jest.fn(),
  };

  const openFoodFactsInvoiceEnrichmentService = {
    enrichItems: jest.fn(),
  };

  const usageQuotaService = {
    assertCanConsume: jest.fn(),
    recordSuccessfulUsage: jest.fn(),
  };

  let service: InvoiceService;
  let loggerSpy: jest.SpyInstance;

  const user: InvoiceUser = {
    id: 'user-1',
    role: 'USER',
    subscriptionPlan: 'PREMIUM',
    subscriptionStatus: 'ACTIVE',
  };

  const file = {
    originalname: 'facture.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('%PDF-1.4'),
  } as Express.Multer.File;

  const createdInvoice = {
    id: 'invoice-1',
    userId: 'user-1',
    pdfUrl: 'https://res.cloudinary.com/demo/raw/upload/invoices/user-1.pdf',
    status: InvoiceStatus.PROCESSING,
    createdAt: new Date('2026-06-05T10:00:00.000Z'),
    updatedAt: new Date('2026-06-05T10:00:00.000Z'),
  };

  const completedInvoice = {
    ...createdInvoice,
    status: InvoiceStatus.COMPLETED,
    merchantName: 'Drive Démo',
    totalAmount: 4.5,
    purchaseDate: new Date('2026-06-05T00:00:00.000Z'),
    invoiceNumber: 'INV-1',
    orderNumber: 'ORD-1',
    analysisProvider: 'mock',
    analysisConfidence: 0.9,
    processingTime: 10,
    errorMessage: null,
    InvoiceItem: [
      {
        id: 'item-1',
        invoiceId: 'invoice-1',
        productId: null,
        detectedName: 'Pommes',
        quantity: 2,
        unitPrice: 2.25,
        totalPrice: 4.5,
        confidence: 0.93,
        validated: false,
        productCode: null,
        category: 'fruits-et-legumes',
        discount: null,
        selectedEan: null,
        suggestedEans: [],
        expiryDate: null,
        storageLocation: null,
        notes: null,
        createdAt: new Date('2026-06-05T10:00:00.000Z'),
        updatedAt: new Date('2026-06-05T10:00:00.000Z'),
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    service = new InvoiceService(
      prisma as any,
      invoiceUploadService as any,
      invoiceAnalysisService as any,
      invoiceProductResolverService as any,
      openFoodFactsInvoiceEnrichmentService as any,
      usageQuotaService as any,
    );
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    tx.invoiceItem.count.mockResolvedValue(1);
    tx.category.findFirst.mockResolvedValue({
      id: 'category-1',
      slug: 'fruits-et-legumes',
    });
    tx.product.findUnique.mockResolvedValue(null);
    tx.product.findFirst.mockResolvedValue(null);
    tx.product.findMany.mockResolvedValue([]);
    tx.product.create.mockResolvedValue({
      id: 'product-1',
      name: 'Pommes',
      categoryId: 'category-1',
    });
    tx.inventoryItem.create.mockResolvedValue({
      id: 'inventory-item-1',
    });
    tx.budget.findFirst.mockResolvedValue({
      id: 'budget-1',
      amount: 300,
    });
    tx.budget.updateMany.mockResolvedValue({ count: 0 });
    tx.budget.create.mockResolvedValue({
      id: 'budget-created',
      amount: 300,
    });
    tx.expense.findUnique.mockResolvedValue(null);
    tx.expense.create.mockResolvedValue({
      id: 'expense-1',
      amount: 4.5,
    });
    prisma.invoice.create.mockResolvedValue(createdInvoice);
    prisma.invoice.findFirst.mockResolvedValue(completedInvoice);
    prisma.invoiceItem.update.mockResolvedValue({
      ...completedInvoice.InvoiceItem[0],
      detectedName: 'Pommes bio',
      quantity: 3,
      totalPrice: 6.75,
      storageLocation: 'frigo',
      updatedAt: new Date('2026-06-05T11:00:00.000Z'),
    });
    invoiceUploadService.uploadInvoicePdf.mockResolvedValue(
      createdInvoice.pdfUrl,
    );
    invoiceAnalysisService.analyzePdf.mockResolvedValue({
      provider: 'mock',
      confidence: 0.9,
      merchantName: 'Drive Démo',
      totalAmount: 4.5,
      purchaseDate: new Date('2026-06-05T00:00:00.000Z'),
      invoiceNumber: 'INV-1',
      orderNumber: 'ORD-1',
      rawData: { provider: 'mock' },
      items: [
        {
          detectedName: 'Pommes',
          quantity: 2,
          unitPrice: 2.25,
          totalPrice: 4.5,
          confidence: 0.93,
          category: 'fruits-et-legumes',
          storageLocation: 'Fruitier',
        },
      ],
    });
    invoiceProductResolverService.resolveItems.mockImplementation(
      async (_tx, items) => items,
    );
    openFoodFactsInvoiceEnrichmentService.enrichItems.mockImplementation(
      async (items) =>
        items.map((item: any) => ({
          ...item,
          externalProductProvider: 'openfoodfacts',
          externalProductStatus: 'FOUND',
          externalProductData: {
            source: 'openfoodfacts',
            barcode: '3017624010701',
            name: item.detectedName,
          },
          externalProductError: null,
        })),
    );
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('importe une facture, crée les lignes et consomme le quota après analyse réussie', async () => {
    const result = await service.importDriveInvoice(user, file);

    expect(usageQuotaService.assertCanConsume).toHaveBeenCalledWith(
      user,
      'DRIVE_IMPORT',
    );
    expect(invoiceUploadService.uploadInvoicePdf).toHaveBeenCalledWith(
      'user-1',
      file,
    );
    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          pdfUrl: createdInvoice.pdfUrl,
          status: InvoiceStatus.PROCESSING,
        }),
      }),
    );
    expect(tx.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'invoice-1' },
        data: expect.objectContaining({
          status: InvoiceStatus.COMPLETED,
          analysisProvider: 'mock',
        }),
      }),
    );
    expect(invoiceAnalysisService.analyzePdf).toHaveBeenCalledWith(
      createdInvoice.pdfUrl,
      file.buffer,
    );
    expect(invoiceProductResolverService.resolveItems).toHaveBeenCalledWith(
      tx,
      [
        expect.objectContaining({
          detectedName: 'Pommes',
          externalProductStatus: 'FOUND',
        }),
      ],
    );
    expect(tx.invoiceItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          invoiceId: 'invoice-1',
          detectedName: 'Pommes',
          totalPrice: 4.5,
          storageLocation: 'Fruitier',
          externalProductProvider: 'openfoodfacts',
          externalProductStatus: 'FOUND',
        }),
      ],
    });
    expect(usageQuotaService.recordSuccessfulUsage).toHaveBeenCalledWith(
      user,
      'DRIVE_IMPORT',
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('invoice_analysis_completed'),
    );
    expect(result).toMatchObject({
      id: 'invoice-1',
      status: InvoiceStatus.COMPLETED,
      items: [
        {
          id: 'item-1',
          detectedName: 'Pommes',
        },
      ],
    });
  });

  it("ne consomme pas le quota si l'analyse échoue", async () => {
    invoiceAnalysisService.analyzePdf.mockRejectedValue(
      new Error('provider down'),
    );

    await expect(service.importDriveInvoice(user, file)).rejects.toThrow(
      BadRequestException,
    );

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: expect.objectContaining({
        status: InvoiceStatus.FAILED,
        errorMessage: "La facture n'a pas pu être analysée",
      }),
    });
    expect(usageQuotaService.recordSuccessfulUsage).not.toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('invoice_analysis_failed'),
    );
  });

  it("masque les erreurs techniques d'upload sans créer de facture", async () => {
    invoiceUploadService.uploadInvoicePdf.mockRejectedValue(
      new Error('cloudinary api secret leaked'),
    );

    await expect(service.importDriveInvoice(user, file)).rejects.toThrow(
      "La facture n'a pas pu être chargée",
    );

    expect(prisma.invoice.create).not.toHaveBeenCalled();
    expect(usageQuotaService.recordSuccessfulUsage).not.toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('invoice_import_upload_failed'),
    );
  });

  it("masque aussi les BadRequest techniques du provider d'analyse", async () => {
    invoiceAnalysisService.analyzePdf.mockRejectedValue(
      new BadRequestException('provider private payload'),
    );

    await expect(service.importDriveInvoice(user, file)).rejects.toThrow(
      "La facture n'a pas pu être analysée",
    );
  });

  it("récupère uniquement une facture appartenant à l'utilisateur", async () => {
    await service.getInvoiceForUser('user-1', 'invoice-1');

    expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'invoice-1',
          userId: 'user-1',
        },
      }),
    );
  });

  it("refuse la validation d'une facture appartenant à un autre utilisateur", async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);

    await expect(
      service.validateInvoiceForUser('user-2', 'invoice-1', {
        invoiceItemIds: ['item-1'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('corrige une ligne de facture non validée', async () => {
    const result = await service.updateInvoiceItemForUser(
      'user-1',
      'invoice-1',
      'item-1',
      {
        detectedName: ' Pommes bio ',
        quantity: 3,
        totalPrice: 6.75,
        storageLocation: ' frigo ',
      },
    );

    expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'invoice-1',
          userId: 'user-1',
        },
        include: {
          InvoiceItem: expect.objectContaining({
            where: { id: 'item-1' },
            take: 1,
          }),
        },
      }),
    );
    expect(prisma.invoiceItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: expect.objectContaining({
        detectedName: 'Pommes bio',
        quantity: 3,
        totalPrice: 6.75,
        storageLocation: 'frigo',
      }),
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
    });
    expect(result).toMatchObject({
      id: 'item-1',
      detectedName: 'Pommes bio',
      quantity: 3,
      totalPrice: 6.75,
    });
  });

  it('recalcule le total depuis la quantité entière et le prix unitaire', async () => {
    prisma.invoiceItem.update.mockResolvedValueOnce({
      ...completedInvoice.InvoiceItem[0],
      quantity: 4,
      unitPrice: 1.99,
      totalPrice: 7.96,
      updatedAt: new Date('2026-06-05T11:00:00.000Z'),
    });

    const result = await service.updateInvoiceItemForUser(
      'user-1',
      'invoice-1',
      'item-1',
      {
        quantity: 4,
        unitPrice: 1.99,
      },
    );

    expect(prisma.invoiceItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: 4,
          unitPrice: 1.99,
          totalPrice: 7.96,
        }),
      }),
    );
    expect(result).toMatchObject({
      quantity: 4,
      unitPrice: 1.99,
      totalPrice: 7.96,
    });
  });

  it("refuse la correction d'une facture non propriétaire ou inconnue", async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);

    await expect(
      service.updateInvoiceItemForUser('user-2', 'invoice-1', 'item-1', {
        detectedName: 'Pommes',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.invoiceItem.update).not.toHaveBeenCalled();
  });

  it('refuse une ligne déjà validée', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...completedInvoice,
      InvoiceItem: [
        {
          ...completedInvoice.InvoiceItem[0],
          validated: true,
        },
      ],
    });

    await expect(
      service.updateInvoiceItemForUser('user-1', 'invoice-1', 'item-1', {
        totalPrice: 10,
      }),
    ).rejects.toThrow('Une ligne déjà validée ne peut plus être corrigée');

    expect(prisma.invoiceItem.update).not.toHaveBeenCalled();
  });

  it('refuse un nom détecté vide', async () => {
    await expect(
      service.updateInvoiceItemForUser('user-1', 'invoice-1', 'item-1', {
        detectedName: '   ',
      }),
    ).rejects.toThrow('Le nom détecté est obligatoire');

    expect(prisma.invoiceItem.update).not.toHaveBeenCalled();
  });

  it("valide une ligne vers l'inventaire et le budget", async () => {
    tx.invoiceItem.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const result = await service.validateInvoiceForUser('user-1', 'invoice-1', {
      invoiceItemIds: ['item-1'],
    });

    expect(tx.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Pommes',
          categoryId: 'category-1',
          unitType: 'UNIT',
        }),
      }),
    );
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        productId: 'product-1',
        quantity: 2,
        purchasePrice: 4.5,
      }),
    });
    expect(tx.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        budgetId: 'budget-1',
        amount: 4.5,
        source: 'Facture Drive',
        invoiceId: 'invoice-1',
        invoiceItemId: 'item-1',
      }),
    });
    expect(tx.invoiceItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: expect.objectContaining({
        productId: 'product-1',
        validated: true,
      }),
    });
    expect(tx.invoice.update).toHaveBeenLastCalledWith({
      where: { id: 'invoice-1' },
      data: expect.objectContaining({
        status: InvoiceStatus.VALIDATED,
      }),
    });
    expect(result).toMatchObject({
      validatedItemCount: 1,
      skippedItemCount: 0,
      inventoryItemCount: 1,
      expenseCount: 1,
      totalBudgetAmount: 4.5,
    });
  });

  it("crée un budget mensuel pour la date de facture avant d'ajouter la dépense", async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...completedInvoice,
      purchaseDate: new Date('2024-09-17T00:00:00.000Z'),
    });
    tx.invoiceItem.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    tx.budget.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'budget-current',
        amount: 450,
      });
    tx.budget.create.mockResolvedValue({
      id: 'budget-september-2024',
      amount: 450,
    });

    const result = await service.validateInvoiceForUser('user-1', 'invoice-1', {
      invoiceItemIds: ['item-1'],
    });
    const expectedPeriodStart = new Date(2024, 8, 1, 0, 0, 0, 0);
    const expectedPeriodEnd = new Date(2024, 9, 0, 23, 59, 59, 999);

    expect(tx.budget.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        OR: [
          {
            periodStart: {
              gte: expectedPeriodStart,
              lte: expectedPeriodEnd,
            },
          },
          {
            periodEnd: {
              gte: expectedPeriodStart,
              lte: expectedPeriodEnd,
            },
          },
          {
            AND: [
              { periodStart: { lte: expectedPeriodStart } },
              { periodEnd: { gte: expectedPeriodEnd } },
            ],
          },
        ],
      },
      data: {
        isActive: false,
      },
    });
    expect(tx.budget.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        amount: 450,
        periodStart: expectedPeriodStart,
        periodEnd: expectedPeriodEnd,
        isActive: true,
      }),
    });
    expect(tx.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        budgetId: 'budget-september-2024',
        amount: 4.5,
        invoiceId: 'invoice-1',
        invoiceItemId: 'item-1',
      }),
    });
    expect(result).toMatchObject({
      expenseCount: 1,
      totalBudgetAmount: 4.5,
    });
  });

  it('crée le produit avec les données enrichies OpenFoodFacts à la validation', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...completedInvoice,
      InvoiceItem: [
        {
          ...completedInvoice.InvoiceItem[0],
          detectedName: 'AUCHAN Crème fluide entière 30% MG UHT 3x20cl',
          selectedEan: '3596710511220',
          productCode: '3596710511220',
          externalProductData: {
            source: 'openfoodfacts',
            barcode: '3596710511220',
            name: 'Crème fluide entière 30% MG UHT 3x20cl',
            brand: 'Auchan',
            quantity: '3 x 20 cl',
            imageUrl: 'https://images.example/creme.jpg',
            nutriscore: 'D',
            ecoscore: 'C',
            novascore: 'GROUP_3',
            ingredients: 'Crème entière UHT',
            nutrients: {
              energy: 287,
              carbohydrates: 3.2,
              sugars: 3.2,
              proteins: 2.1,
              fats: 30,
              saturatedFats: 19,
              fiber: 0,
              salt: 0.08,
            },
          },
        },
      ],
    });

    await service.validateInvoiceForUser('user-1', 'invoice-1', {
      invoiceItemIds: ['item-1'],
    });

    expect(tx.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Crème fluide entière 30% MG UHT 3x20cl',
          brand: 'Auchan',
          barcode: '3596710511220',
          nutriscore: 'D',
          ecoscore: 'C',
          novascore: 'GROUP_3',
          ingredients: 'Crème entière UHT',
          imageUrl: 'https://images.example/creme.jpg',
          externalId: '3596710511220',
          nutrients: {
            energy: 287,
            carbohydrates: 3.2,
            sugars: 3.2,
            proteins: 2.1,
            fats: 30,
            saturatedFats: 19,
            fiber: 0,
            salt: 0.08,
          },
        }),
      }),
    );
  });

  it('réutilise le produit existant si la ligne contient un productId', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...completedInvoice,
      InvoiceItem: [
        {
          ...completedInvoice.InvoiceItem[0],
          productId: 'product-existing',
        },
      ],
    });
    tx.product.findUnique.mockResolvedValue({
      id: 'product-existing',
      name: 'Pommes',
    });

    await service.validateInvoiceForUser('user-1', 'invoice-1', {
      invoiceItemIds: ['item-1'],
    });

    expect(tx.product.findUnique).toHaveBeenCalledWith({
      where: { id: 'product-existing' },
      include: { Category: true },
    });
    expect(tx.product.create).not.toHaveBeenCalled();
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'product-existing',
      }),
    });
  });

  it('met à jour un produit existant avec les données OpenFoodFacts', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...completedInvoice,
      InvoiceItem: [
        {
          ...completedInvoice.InvoiceItem[0],
          productId: 'product-existing',
          externalProductData: {
            source: 'openfoodfacts',
            barcode: '3017624010701',
            name: 'Pâte à tartiner aux noisettes',
            brand: 'Ferrero',
            imageUrl: 'https://images.example/nutella.jpg',
            nutriscore: 'E',
            ecoscore: 'D',
            ingredients: 'Sucre, huile de palme, noisettes',
            nutrients: {
              energy: 539,
              fats: 30.9,
            },
          },
        },
      ],
    });
    tx.product.findUnique.mockResolvedValue({
      id: 'product-existing',
      name: 'Ancien nom',
      brand: 'Ancienne marque',
      barcode: null,
      imageUrl: 'https://images.example/old.jpg',
      nutriscore: 'A',
      ecoscore: null,
      novascore: null,
      ingredients: 'Ancienne composition',
      nutrients: { energy: 100 },
      externalId: null,
    });
    tx.product.update.mockResolvedValue({
      id: 'product-existing',
      name: 'Pâte à tartiner aux noisettes',
      brand: 'Ferrero',
      barcode: '3017624010701',
    });

    await service.validateInvoiceForUser('user-1', 'invoice-1', {
      invoiceItemIds: ['item-1'],
    });

    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-existing' },
        data: expect.objectContaining({
          barcode: '3017624010701',
          name: 'Pâte à tartiner aux noisettes',
          brand: 'Ferrero',
          imageUrl: 'https://images.example/nutella.jpg',
          nutriscore: 'E',
          ecoscore: 'D',
          ingredients: 'Sucre, huile de palme, noisettes',
          externalId: '3017624010701',
          nutrients: {
            energy: 539,
            fats: 30.9,
          },
        }),
        include: { Category: true },
      }),
    );
    expect(tx.product.create).not.toHaveBeenCalled();
  });

  it('sauvegarde les données OpenFoodFacts brutes dans un nouveau produit', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...completedInvoice,
      InvoiceItem: [
        {
          ...completedInvoice.InvoiceItem[0],
          selectedEan: '3596710511220',
          productCode: '3596710511220',
          externalProductData: {
            raw: {
              code: '3596710511220',
              product_name_fr: 'Crème fluide entière 30% MG UHT 3x20cl',
              brands: 'Auchan',
              image_front_url: 'https://images.example/creme.jpg',
              nutriscore_grade: 'd',
              ecoscore_grade: 'c',
              nova_group: 3,
              ingredients_text_fr: 'Crème entière UHT',
              nutriments: {
                'energy-kcal_100g': '287',
                fat_100g: '30',
                'saturated-fat_100g': '19',
                salt_100g: '0.08',
              },
            },
          },
        },
      ],
    });

    await service.validateInvoiceForUser('user-1', 'invoice-1', {
      invoiceItemIds: ['item-1'],
    });

    expect(tx.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Crème fluide entière 30% MG UHT 3x20cl',
          brand: 'Auchan',
          barcode: '3596710511220',
          nutriscore: 'D',
          ecoscore: 'C',
          novascore: 'GROUP_3',
          ingredients: 'Crème entière UHT',
          imageUrl: 'https://images.example/creme.jpg',
          externalId: '3596710511220',
          nutrients: {
            energy: 287,
            fats: 30,
            saturatedFats: 19,
            salt: 0.08,
          },
        }),
      }),
    );
    expect(tx.inventoryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'product-1',
      }),
    });
  });

  it('ignore une ligne déjà validée pour rendre le retry idempotent', async () => {
    tx.expense.findUnique.mockResolvedValue({
      id: 'expense-existing',
      amount: 4.5,
    });
    prisma.invoice.findFirst.mockResolvedValue({
      ...completedInvoice,
      InvoiceItem: [
        {
          ...completedInvoice.InvoiceItem[0],
          validated: true,
        },
      ],
    });

    const result = await service.validateInvoiceForUser('user-1', 'invoice-1', {
      invoiceItemIds: ['item-1'],
    });

    expect(tx.inventoryItem.create).not.toHaveBeenCalled();
    expect(tx.expense.create).not.toHaveBeenCalled();
    expect(tx.invoiceItem.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      validatedItemCount: 0,
      skippedItemCount: 1,
      inventoryItemCount: 0,
      expenseCount: 0,
    });
  });

  it('répare une ligne déjà validée sans dépense budget', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      ...completedInvoice,
      InvoiceItem: [
        {
          ...completedInvoice.InvoiceItem[0],
          validated: true,
        },
      ],
    });

    const result = await service.validateInvoiceForUser('user-1', 'invoice-1', {
      invoiceItemIds: ['item-1'],
    });

    expect(tx.inventoryItem.create).not.toHaveBeenCalled();
    expect(tx.invoiceItem.update).not.toHaveBeenCalled();
    expect(tx.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        budgetId: 'budget-1',
        amount: 4.5,
        invoiceId: 'invoice-1',
        invoiceItemId: 'item-1',
      }),
    });
    expect(result).toMatchObject({
      validatedItemCount: 0,
      skippedItemCount: 1,
      inventoryItemCount: 0,
      expenseCount: 1,
      totalBudgetAmount: 4.5,
    });
  });

  it('ne recrée pas de dépense ni de budget si une dépense existe déjà pour la ligne', async () => {
    tx.expense.findUnique.mockResolvedValue({
      id: 'expense-existing',
      amount: 4.5,
    });

    const result = await service.validateInvoiceForUser('user-1', 'invoice-1', {
      invoiceItemIds: ['item-1'],
    });

    expect(tx.inventoryItem.create).not.toHaveBeenCalled();
    expect(tx.expense.create).not.toHaveBeenCalled();
    expect(tx.invoiceItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: expect.objectContaining({
        productId: 'product-1',
        validated: true,
      }),
    });
    expect(result).toMatchObject({
      validatedItemCount: 0,
      skippedItemCount: 1,
      inventoryItemCount: 0,
      expenseCount: 0,
      totalBudgetAmount: 0,
    });
  });

  it('laisse la facture en COMPLETED lors d’une validation partielle', async () => {
    tx.invoiceItem.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    await service.validateInvoiceForUser('user-1', 'invoice-1', {
      invoiceItemIds: ['item-1'],
    });

    expect(tx.invoice.update).toHaveBeenLastCalledWith({
      where: { id: 'invoice-1' },
      data: expect.objectContaining({
        status: InvoiceStatus.COMPLETED,
      }),
    });
  });

  it('refuse une facture en cours ou en échec', async () => {
    prisma.invoice.findFirst.mockResolvedValueOnce({
      ...completedInvoice,
      status: InvoiceStatus.PROCESSING,
    });

    await expect(
      service.validateInvoiceForUser('user-1', 'invoice-1', {
        invoiceItemIds: ['item-1'],
      }),
    ).rejects.toThrow("La facture est encore en cours d'analyse");

    prisma.invoice.findFirst.mockResolvedValueOnce({
      ...completedInvoice,
      status: InvoiceStatus.FAILED,
    });

    await expect(
      service.validateInvoiceForUser('user-1', 'invoice-1', {
        invoiceItemIds: ['item-1'],
      }),
    ).rejects.toThrow(
      "Une facture en échec d'analyse ne peut pas être validée",
    );
  });
});
