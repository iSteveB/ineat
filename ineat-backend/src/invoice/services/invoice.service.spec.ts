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

  it('ignore une ligne déjà validée pour rendre le retry idempotent', async () => {
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
