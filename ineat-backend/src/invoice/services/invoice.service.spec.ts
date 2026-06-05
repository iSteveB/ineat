import { BadRequestException } from '@nestjs/common';
import { InvoiceStatus } from '../../../prisma/generated/prisma/client';
import { InvoiceService, InvoiceUser } from './invoice.service';

describe('InvoiceService', () => {
  const tx = {
    invoice: {
      update: jest.fn(),
    },
    invoiceItem: {
      createMany: jest.fn(),
    },
  };

  const prisma = {
    invoice: {
      create: jest.fn(),
      findFirst: jest.fn(),
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

  const usageQuotaService = {
    assertCanConsume: jest.fn(),
    recordSuccessfulUsage: jest.fn(),
  };

  let service: InvoiceService;

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
    service = new InvoiceService(
      prisma as any,
      invoiceUploadService as any,
      invoiceAnalysisService as any,
      usageQuotaService as any,
    );
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    prisma.invoice.create.mockResolvedValue(createdInvoice);
    prisma.invoice.findFirst.mockResolvedValue(completedInvoice);
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
        },
      ],
    });
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
    expect(tx.invoiceItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          invoiceId: 'invoice-1',
          detectedName: 'Pommes',
          totalPrice: 4.5,
        }),
      ],
    });
    expect(usageQuotaService.recordSuccessfulUsage).toHaveBeenCalledWith(
      user,
      'DRIVE_IMPORT',
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
});
