import { ReceiptService } from './receipt.service';
import { DocumentType } from '../interfaces/ocr-provider.interface';
import { ReceiptStatus } from '../../../prisma/generated/prisma/client';

describe('ReceiptService', () => {
  const prisma = {
    receipt: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const ocrService = {
    processDocument: jest.fn(),
  };
  const llmService = {
    isAvailable: jest.fn(),
  };
  const claudeService = {
    isAvailable: jest.fn(),
  };
  const cloudinaryStorage = {
    uploadReceipt: jest.fn(),
  };
  const notificationService = {
    createReceiptNotification: jest.fn(),
  };
  const receiptProcessingQueue = {
    addReceiptProcessingJob: jest.fn(),
  };

  let service: ReceiptService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReceiptService(
      prisma as any,
      ocrService as any,
      llmService as any,
      claudeService as any,
      cloudinaryStorage as any,
      notificationService as any,
      receiptProcessingQueue as any,
    );
  });

  it('creates a processing receipt and enqueues OCR/LLM work', async () => {
    const fileBuffer = Buffer.from('receipt-image');
    const receipt = {
      id: 'receipt-1',
      userId: 'user-1',
      documentType: 'RECEIPT_IMAGE',
      status: ReceiptStatus.PROCESSING,
    };

    cloudinaryStorage.uploadReceipt.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/receipt.png',
    });
    prisma.receipt.create.mockResolvedValue(receipt);
    receiptProcessingQueue.addReceiptProcessingJob.mockResolvedValue({
      id: 'receipt-receipt-1',
    });

    await expect(
      service.createReceipt({
        userId: 'user-1',
        documentType: DocumentType.RECEIPT_IMAGE,
        fileBuffer,
        fileName: 'ticket.png',
      }),
    ).resolves.toBe(receipt);

    expect(prisma.receipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        status: ReceiptStatus.PROCESSING,
        imageUrl: 'https://cdn.example.com/receipt.png',
        pdfUrl: null,
      }),
    });
    expect(receiptProcessingQueue.addReceiptProcessingJob).toHaveBeenCalledWith({
      receiptId: 'receipt-1',
      fileBuffer,
      documentType: DocumentType.RECEIPT_IMAGE,
      userId: 'user-1',
      metadata: expect.objectContaining({
        originalFileName: 'ticket.png',
        fileSize: fileBuffer.length,
        uploadedAt: expect.any(Date),
      }),
    });
    expect(ocrService.processDocument).not.toHaveBeenCalled();
  });

  it('marks a receipt as failed with a notification', async () => {
    prisma.receipt.update.mockResolvedValue({ id: 'receipt-1' });

    await service.markReceiptAsFailed('receipt-1', 'OCR indisponible');

    expect(prisma.receipt.update).toHaveBeenCalledWith({
      where: { id: 'receipt-1' },
      data: expect.objectContaining({
        status: ReceiptStatus.FAILED,
        errorMessage: 'OCR indisponible',
      }),
    });
    expect(notificationService.createReceiptNotification).toHaveBeenCalledWith(
      'receipt-1',
      ReceiptStatus.FAILED,
      'OCR indisponible',
    );
  });
});
